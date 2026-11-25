# Architecture and development

The browser Studio is a deterministic, dependency-free local workspace. The native and optional host bridges create the same versioned snapshot.

- `studio/core.js`: normalisation, model audit, marking, revisions, CSV and supplier mapping, catalogue matching, measured quantities, pricing, curtain wall estimates, solar position, Databuild XML and Bluebeam parsing. Node exposes CommonJS for tests; browser exposes WinMatch.
- `studio/index.template.html`: original UI, inline styles and interaction. Build injects the core source at a unique marker, producing a distributable offline document.
- `revit/`: native Revit C# ribbon and file-based bridge. OpenStudio and OpenSelection use read-only transactions; explicit write commands use native transactions and confirmation.
- `archicad/`: Graphisoft Python JSON API companion, property discovery/mapping and read-only scan.
- `ifc/`: optional IfcOpenShell reader, no model writes.
- `scripts/bridge.py`: local snapshot and self-contained HTML generator. JSON is safely embedded by escaping HTML-sensitive characters.
- `schema/`: portable data interchange. Additional extension fields can be introduced compatibly, but breaking changes require a schema-major increment.

Prefer explicit provenance over guesses: unknown dimensions stay null, money is not assumed, product matching does not modify geometry. Preserve stable source IDs, avoid ambiguous dimension conversion, and keep UI validation separate from regulatory validation.

## Future native expansion

1. Verify host SDK builds across targeted versions and publish signed/hashes release artifacts.
2. True host docked palettes and native schedule creation, model selection synchronization, richer native property mapping and Archicad C++ APX.
3. Verified open-source or vendor-approved adapters for manufacturer systems, WinMatch production API and native tool-chest releases.
4. IFC property-set mapping, curtain panel geometry, site winds/topography data sources, multi-level view mapping and annotation collision handling.
5. Accessibility and performance benchmarking, multi-lingual UI and user-tested workflow.

## Build/test

Run the README commands. Unit tests cover pure data functions and fake connector contracts; UI contract tests initialise the 12 pages with a minimal DOM stub, not an actual browser. Browser tests run under Playwright Chromium in GitHub Actions; licensed host integration tests require a workstation.
