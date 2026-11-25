# Release and integration verification matrix

This is a source preview; no claim of production readiness. Validate in a fresh test project before releasing native binaries.

| Check | Evidence required | Preview status |
|---|---|---|
| Core unit functions | Node test results | Passed in build environment |
| Python connectors | Mock connection contracts, SI conversions and escaping | Passed in build environment |
| UI initialisers | All 12 screens in demo and empty model | Passed with a DOM stub |
| Actual Chromium responsiveness/interaction/print | Playwright at 320/375/768/1024/1280/1440/1920; PDF and accessibility visual review | Browser process blocked by execution environment; test included for CI |
| Revit 2025, 2026 | Build against each SDK; install; launch; scan window/door families, type and instance params; compare dimensions and marks against native schedule | Pending |
| Revit auto-tag | Confirm correct loaded category symbol; floor/elevation/both; existing/blank skipped; rollback and Undo; visual overlap review | Pending |
| Revit RFA and marks | Trusted family load; duplicate/non-window rejection; mark patch stale/project mismatch; worksharing and undo | Pending |
| Revit IFC | Export IFC4, compare IDs and dimensions, verify model unchanged after transaction rollback | Pending |
| Archicad 27, 28, 29 | Actual connection, property map, valid length types, revisions, native object library, native labels and IFC translation | Pending |
| IFC 2x3/IFC4 | Import actual fixtures with m/mm/imperial units, GlobalId stability and missing attrs | Pending live reader; pure unit conversion tested |
| Manufacturer | Import/export fixtures against vendor-documented version; per product spec/units/handing | Generic contract tested, proprietary adapter pending |
| Databuild 2.71 | Import carrier in a dummy job with confirmed item mappings; compare expected variables; rerun and verify no unintended accumulation | XML structure and numeric formulas tested; actual host pending |
| Bluebeam Revu 20/21 | Open selectable PDF annotations, save native toolsets, verify exported .btx and native measurement/count behaviours | PDF annotations counted, pages rendered; actual Revu pending |
| Independent financial and quantity review | Compare sample rates/markups, take-off measurements and site solar geometry against known examples | Pure calculations unit-tested; real project review pending |

Before tagging a GitHub release, document exact host versions, SDK and dependency versions, OS, test fixture provenance, known issues, and verified downloads. Never publish actual client project files or proprietary manufacturer libraries without permission.
