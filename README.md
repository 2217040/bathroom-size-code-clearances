# Bathroom Size Code-Clearance Dataset

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.24319105.svg)](https://doi.org/10.5281/zenodo.24319105)
[![License: CC0-1.0](https://img.shields.io/badge/License-CC0_1.0-lightgrey.svg)](https://creativecommons.org/publicdomain/zero/1.0/)

Every full bathroom and half bathroom size, inch by inch, checked against the
International Residential Code (IRC) clearance minimums: which standard layouts
fit, which do not, and the exact check each failing layout breaks.

- **26,628** room-size × door combinations (8,876 room sizes × 3 door types)
- **106,512** layout checks, each with its failing checks listed
- **84** distinct layouts (tub, walk-in shower, corner shower, toilet room, wall-hung sink…)
- Full baths from 3′6″ to 12′ on the short wall and 6′ to 14′ on the long wall;
  half baths from 3′ × 4′ to 6′ × 8′ — at 1″ resolution

Built and maintained by [FitsTheRoom](https://fitstheroom.com/), which draws
these same layouts to scale for any room. Every row is produced by the site's own
layout engine, so it matches the plan the site draws for that room exactly.
The data is regenerated every week: when the site's engine changes, a new version
appears here, as a GitHub release and as a new version on Zenodo.

## What the data shows

**Full bathrooms have a sharp boundary.** A full bath (toilet, vanity, and a tub
or shower) fits at least one standard layout if and only if the short wall is at
least **5′** and the long wall at least **6′6″**. All 5,524 sizes inside that
boundary pass; every size outside it fails all four layouts. The smallest is
**5′ × 6′6″ (32.5 sq ft)**. The limit is the fixtures — a standard 60″ tub or
30″ × 60″ shower — and changing the door never rescues a failing full-bath size.

**For half baths, the door decides it.** With a standard in-swing door, 315 half-bath
sizes (20.8%) fail every layout. **Re-hanging the door to swing out rescues 172 of
them (55%)** and shrinks the smallest workable half bath from **3′ × 5′11″
(17.8 sq ft)** to **3′ × 5′1″ (15.3 sq ft)**. A pocket door, the usual advice for a
tight bathroom, rescues only 48: it needs 30″ of plain wall beside the opening,
which small rooms rarely have.

## Files

| File | Rows | What it is |
|---|---|---|
| `bathroom-size-summary.csv` | 26,628 | One row per room size and door type: how many layouts pass and which |
| `bathroom-size-code-check.csv` | 106,512 | One row per layout tested: pass/fail and the checks it fails |
| `layouts.csv` | 84 | What each `layout_key` is: name, summary and fixtures |
| `clearances.csv` | 5 | The clearance minimums every layout is checked against, with IRC sections |
| `metadata.json` | — | Engine commit, room limits, grid, row counts |
| `scripts/generate.ts` | — | The generator, run against a FitsTheRoom checkout |

### `bathroom-size-summary.csv`

| Column | Meaning |
|---|---|
| `room_type` | `full_bath` or `half_bath` |
| `short_wall_in`, `long_wall_in` | Room size in inches (short wall ≤ long wall) |
| `area_sqft` | Floor area, square feet |
| `door` | `swing_in`, `swing_out` or `pocket` (30″ door in the front wall) |
| `layouts_tested` | Always 4 (plans A–D) |
| `layouts_passing` | How many of the four pass every check |
| `passing_plan_ids` | Which ones, e.g. `A;B` |

### `bathroom-size-code-check.csv`

The same rooms, one row per plan, plus `plan_id`, `layout_key` (see `layouts.csv`),
`passes` (1/0) and `failed_checks` (semicolon-separated, empty when it passes).

**Plan letters mean different layouts in different rooms.** Narrow full baths
(short wall under 6′6″) use one family of plans and larger ones another; half
baths have their own. Fixture sizes also adapt to the room (a wider room gets a
wider vanity). Always read a plan through its `layout_key`, not its letter.

## Method

Each room is run through the [FitsTheRoom](https://fitstheroom.com/) layout engine,
the same code that draws the plans on the site. For each of four standard layouts
the engine places fixtures of typical sizes, then checks the clearances in
`clearances.csv` (IRC R307.1 and P2708.1): toilet centerline at least 15″ from any
side obstruction, 21″ of clear floor in front of the toilet and vanity, a 30″ × 30″
minimum shower with a 22″ opening and 24″ of clear floor in front of it, plus a
door-swing check that no fixture is in the door's path. How each check works is
described on the site's [How we check plans](https://fitstheroom.com/how-we-check/)
and [clearance rules](https://fitstheroom.com/clearance-rules/) pages.

## Limitations

- **"Fails" means none of these four standard layouts fits**, not that no bathroom
  is possible. A custom layout, smaller fixtures (a 48″ shower, a compact toilet) or
  a different door position can fit rooms this dataset marks as failing.
- The checks are the **IRC minimums**. Many US jurisdictions adopt the IRC, but local
  amendments can be stricter. This is planning data, not a code determination —
  confirm with your local building department.
- Accessible (ADA) bathrooms have much larger clearances and are not covered here.

## License

The data files and the generator are released under
[CC0 1.0 Universal](LICENSE): no rights reserved, no permission or attribution
required. The clearance values are facts cited from the IRC; no code text is
reproduced.

## Citing

Every release is archived on Zenodo with a DOI. The DOI below resolves to the
newest version; each version also has its own DOI on the Zenodo record page.

> FitsTheRoom, *Bathroom Size Code-Clearance Dataset* (2026).
> Zenodo. https://doi.org/10.5281/zenodo.24319105

A link to [fitstheroom.com](https://fitstheroom.com/) is appreciated, though CC0
means none is required.

## Reproducing

```sh
git clone https://github.com/2217040/bathroom-size-code-clearances
# with a FitsTheRoom checkout next to it, and its dependencies installed:
cd fitstheroom && npx tsx ../bathroom-size-code-clearances/scripts/generate.ts . ../bathroom-size-code-clearances
```

`metadata.json` records the engine commit each release was generated from.
