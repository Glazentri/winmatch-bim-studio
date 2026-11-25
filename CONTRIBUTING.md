# Contributing to WinMatch BIM Studio

Thank you for improving open fenestration tooling. Contributions from practicing estimators, BIM users and developers are encouraged.

- Start with an issue describing the user workflow, host version, expected and actual result.
- Fork and create a focused branch. Keep changes small, add test cases and update schema/docs for interchange changes.
- Run `python scripts/build_studio.py`, `node --test tests/*.test.cjs` and `python -m unittest discover -s tests -p 'test_*.py'`. Run Playwright on a supported local system.
- For host changes, document the precise Revit/Archicad release, test fixture and native behaviour. Do not include licensed SDK DLLs or customer models.
- For quantities, show units, assumptions, missing values and test calculations. For manufacturer adapters, provide a redistributable documented fixture and actual roundtrip evidence.
- Never invent compatibility claims or approvals. Mark incomplete work as a preview.
- Use accessible controls, clear data provenance, concise Australian English and consistent units.
- By contributing, you agree original contributions are available under the repository MIT licence.

## Feature priorities

Native docked palettes; native Archicad C++ integration; verified vendor adapters; scalable model-view annotation; accessibility; localisation; sustainable envelope work.
