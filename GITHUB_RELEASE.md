# GitHub publishing copy

**Suggested repository name:** `winmatch-bim-studio`

**Short repository description (copy into GitHub):**

Open-source window, door and curtain-wall BIM coordination for Revit, Archicad and IFC, with visual schedules, quantity take-offs, pricing, manufacturer catalogues, and estimating bridges.

**Suggested topics:** `bim`, `revit`, `archicad`, `ifc`, `fenestration`, `windows`, `doors`, `curtain-wall`, `estimating`, `quantity-takeoff`, `open-source`, `databuild`, `bluebeam`

## Release title

WinMatch BIM Studio v0.1.0 — Open fenestration coordination (developer preview)

## Release description

WinMatch BIM Studio by Glazentri brings the window and door workflow together: scan model information from Revit, Archicad or IFC; review dimensions and specifications; match supplier catalogue sizes; design branded visual schedules; quantify reveals, lintels, flashings and subsills; build a project estimate; and export portable manufacturer-ready mappings. The suite also includes a rectangular curtain module designer, site solar compass, Databuild QGen example XML and a Bluebeam markup authoring kit.

Built as a local-first, MIT-licensed project, with a self-contained Studio that runs offline and no sign-in or subscription. The Revit adapter uses a native ribbon, while the Archicad companion uses the official local JSON/Python interface. A separately installed IfcOpenShell bridge provides open BIM interoperability.

This is an early developer preview rather than a certified or production-tested plugin release. The standalone Studio data logic and mock connector contracts have been tested. Native BIM and estimating-host integration, actual browser viewport testing and proprietary manufacturer formats require further validation. Please report bugs or contribute host-tested fixtures.

**Repository upload:** unzip the package; create an empty GitHub repository; add the files at the root (README.md, LICENSE etc.); commit; publish the release notes above. Do not commit SDK DLLs, client models, supplier credentials or real pricing.
