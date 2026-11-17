/**
 * Builds the dataset by running every room size through the FitsTheRoom layout engine.
 *
 *   npx tsx scripts/generate.ts /path/to/fitstheroom-checkout [outdir]
 *
 * The engine is used exactly as the live site uses it (src/engine/plans.ts), so every row
 * matches what fitstheroom.com draws for that room. The engine commit is recorded in
 * metadata.json so any release can be reproduced.
 */
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const engineRoot = resolve(process.argv[2] ?? '../fitstheroom');
const out = resolve(process.argv[3] ?? '.');
const { buildAll, PLAN_IDS, ROOM_LIMITS } = await import(pathToFileURL(join(engineRoot, 'src/engine/plans.ts')).href);
const { RULES } = await import(pathToFileURL(join(engineRoot, 'src/engine/rules.ts')).href);

type Kind = 'bath' | 'half';
const KINDS: { kind: Kind; label: string }[] = [
  { kind: 'bath', label: 'full_bath' },
  { kind: 'half', label: 'half_bath' },
];
// Door types the site lets readers choose for bathrooms: standard in-swing, out-swing, pocket.
const DOORS: { id: string; label: string }[] = [
  { id: 'in', label: 'swing_in' },
  { id: 'out', label: 'swing_out' },
  { id: 'pocket', label: 'pocket' },
];

const csv = (v: unknown) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (a: unknown[]) => a.map(csv).join(',') + '\n';

const layouts = new Map<string, { key: string; room_type: string; plan_id: string; name: string; summary: string; fixtures: string }>();
const layoutKey = (roomType: string, p: { id: string; name: string; fixtures: string[] }) => {
  const sig = `${roomType}|${p.id}|${p.name}|${p.fixtures.join(' + ')}`;
  let l = layouts.get(sig);
  if (!l) {
    l = { key: `${roomType === 'full_bath' ? 'F' : 'H'}${String(layouts.size + 1).padStart(3, '0')}`, room_type: roomType,
      plan_id: p.id, name: p.name.replace(/^Plan [A-D] · /, ''), summary: (p as any).sub ?? '', fixtures: p.fixtures.join(' + ') };
    layouts.set(sig, l);
  }
  return l.key;
};

let detail = line(['room_type', 'short_wall_in', 'long_wall_in', 'area_sqft', 'door', 'plan_id', 'layout_key', 'passes', 'failed_checks']);
let summary = line(['room_type', 'short_wall_in', 'long_wall_in', 'area_sqft', 'door', 'layouts_tested', 'layouts_passing', 'passing_plan_ids']);
let nDetail = 0, nSummary = 0;
const counts: Record<string, number> = {};

for (const { kind, label } of KINDS) {
  const L = ROOM_LIMITS[kind];
  let sizes = 0;
  for (let D = L.D[0]; D <= L.D[1]; D++) {
    for (let W = Math.max(D, L.W[0]); W <= L.W[1]; W++) {
      sizes++;
      const area = Math.round((W * D / 144) * 10) / 10;
      for (const door of DOORS) {
        const plans = buildAll({ W, D }, door.id, kind);
        const passing: string[] = [];
        for (const id of PLAN_IDS) {
          const p = plans[id];
          if (p.passes) passing.push(id);
          const failed = p.checks.filter((c: { ok: boolean }) => !c.ok).map((c: { label: string }) => c.label).join('; ');
          detail += line([label, D, W, area, door.label, id, layoutKey(label, p), p.passes ? 1 : 0, failed]);
          nDetail++;
        }
        summary += line([label, D, W, area, door.label, PLAN_IDS.length, passing.length, passing.join(';')]);
        nSummary++;
      }
    }
  }
  counts[label] = sizes;
}

let lay = line(['layout_key', 'room_type', 'plan_id', 'name', 'summary', 'fixtures']);
for (const l of layouts.values()) lay += line([l.key, l.room_type, l.plan_id, l.name, l.summary, l.fixtures]);

// The clearance minimums every plan is checked against, with where they come from.
const R = RULES as Record<string, number>;
const clear = [
  ['toilet_centerline_to_side', R.toiletSide, 'Toilet centerline to a side wall, tub, shower or vanity', 'IRC R307.1 (Figure R307.1)'],
  ['clear_floor_front_of_toilet_and_lavatory', R.frontClear, 'Clear floor in front of the toilet and the lavatory/vanity', 'IRC R307.1 (Figure R307.1)'],
  ['clear_floor_at_shower_entry', R.showerEntry, 'Clear floor in front of a shower opening', 'IRC R307.1 (Figure R307.1)'],
  ['shower_opening_width', R.showerOpening, 'Minimum unobstructed shower opening width', 'IRC P2708.1'],
  ['shower_min_interior_dimension', R.showerMin, 'Minimum interior dimension of a shower (30 x 30)', 'IRC P2708.1'],
];
let cl = line(['rule', 'inches', 'description', 'source']);
for (const c of clear) cl += line(c);

let sha = 'unknown';
try { sha = execSync('git rev-parse HEAD', { cwd: engineRoot }).toString().trim(); } catch { /* not a git checkout */ }

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'bathroom-size-code-check.csv'), detail);
writeFileSync(join(out, 'bathroom-size-summary.csv'), summary);
writeFileSync(join(out, 'layouts.csv'), lay);
writeFileSync(join(out, 'clearances.csv'), cl);
writeFileSync(join(out, 'metadata.json'), JSON.stringify({
  generated_by: 'scripts/generate.ts',
  engine: 'https://fitstheroom.com layout engine (src/engine/)',
  engine_commit: sha,
  room_limits_in: { full_bath: ROOM_LIMITS.bath, half_bath: ROOM_LIMITS.half },
  grid_in: 1,
  doors: DOORS.map((d) => d.label),
  room_sizes: counts,
  rows: { 'bathroom-size-code-check.csv': nDetail, 'bathroom-size-summary.csv': nSummary, 'layouts.csv': layouts.size },
}, null, 2) + '\n');

console.log(JSON.stringify({ engine_commit: sha, room_sizes: counts, detail: nDetail, summary: nSummary, layouts: layouts.size }));
