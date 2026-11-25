# Manufacturer library and interoperability

## Two distinct library concepts

| Library | Example | WinMatch workflow |
|---|---|---|
| Catalogue / ERP product data | Standard sizes, product codes, configuration, series, frame/glass | Import a documented generic CSV/JSON catalogue into Studio's Manufacturer library. |
| BIM object definitions | Revit RFA; Archicad GDL/library object | Load an approved manufacturer object using native BIM tools; scan its instances in WinMatch. |

Do not treat a manufacturer catalogue record as a fabrication specification.

## Import standard sizes

Use the sample [manufacturer CSV](examples/manufacturer-catalogue.csv), or download the template in the Studio. Each row represents one documented product configuration. Required headers:

| Column | Required | Format |
|---|---:|---|
| manufacturer | Yes | Supplier/manufacturer name |
| sku | Yes | Unique product identifier within manufacturer |
| kind | Yes | `window` / `door` |
| width_mm | Yes | Positive numeric dimension in mm |
| height_mm | Yes | Positive numeric dimension in mm |
| operation | No | Manufacturer's documented operation |
| handing | No | Explicit supplier convention; do not infer |
| series | No | Product/system series |
| material | No | Frame material |
| glazing | No | Glass specification |
| colour | No | Finish |
| notes | No | e.g. size convention, catalogue edition, constraints |

JSON accepts `{"products":[...]}` or an array, with `widthMm`/`heightMm` or `width_mm`/`height_mm`. Rows with invalid required fields or duplicate manufacturer + SKU combinations are rejected. File import is local. Fictional data is labelled as such.

### Match and review

1. Open Manufacturer library; import CSV/JSON.
2. Pick the opening and tolerance (0–500 mm).
3. Inspect results sorted by specification conflicts, then absolute dimensional differences.
4. Compare each difference and unknown field. "Exact size" denotes nominal width/height equality, not a verified manufacturing fit.
5. Associate the product SKU for quotation review. This changes manufacturer, SKU and series metadata only; it never changes opening dimensions or overrides glazing, handing or material.
6. Confirm actual manufacturer size convention (frame, structural opening, or overall reveal), offsets, regional availability, hardware and assembly limitations. Custom sizes are not inferred.

## Supplier export mapper

Go to Export > Manufacturer export. Choose mm or inches and edit/reorder the exact required headers. Add/remove columns and select supported source fields. Quantity is one per model instance; area and accessory quantities use the selected measured-quantity basis, in square metres and lineal metres irrespective of dimension unit. Opening, actual and subsill dimensions can be mapped explicitly. Unknown fields are blank. The CSV is UTF-8 with BOM, quoted values, and CRLF line endings. Formula-like text is prefixed with an apostrophe to reduce spreadsheet formula execution risk.

- Save the profile so one supplier's column mapping can be reused.
- Load profiles shared by the supplier only after checking headers, field semantics and units.
- For case-sensitive proprietary fields or specific enumerations, developers can build a dedicated adapter.
- [Example mapping](examples/manufacturer-export-profile.json) is generic and **not** a vendor-authorised format.

## Proprietary software adapter strategy

| Target | Proposed integration path | Status |
|---|---|---|
| Forterro Logikal | Use its documented BIM/CAD/ERP interfaces, obtain the relevant specification, validate sample projects/positions and negotiate licensing/access. | Not implemented / no direct import claim |
| Klaes | Obtain supported integration/import specification from vendor or licensed customer. | Not implemented |
| Windowmaker | Obtain current order/quotation import/export specification and fixture. | Not implemented |
| In-house manufacturing ERP | Map a documented CSV or write a small connector against the versioned snapshot contract. | Generic mapping implemented |
| Other BIM/CAD | IFC or vendor-provided model/file exchange. | IFC reader source included |

Logikal's public documentation describes integration interfaces for CAD, BIM and ERP; the exact edition, licensed module, payload and feature compatibility must be confirmed from the vendor. Do not reverse-engineer or publish proprietary interfaces without rights. No direct CNC or machining data is generated.

### Contributing a vendor adapter

1. Provide test fixtures that the vendor or contributor may redistribute, or generate fake fixtures matching public specifications.
2. Document product keys, handedness/viewing convention, units, size basis, tolerances, valid configuration enumerations, required values, and null/error handling.
3. Treat missing required fields as validation errors; do not silently default them.
4. Round trip a small set of documented example openings in a vendor-authorised test system. Compare quantities and geometry visually, record import warnings and validate material, glass and hardware.
5. Publish a compatibility matrix per version and profile.
6. Keep credentials outside the repository and never commit real orders or client models.

References: [Logikal interface documentation](https://help.orgadata.com/en/documentation/interfaces/), [Logikal modules](https://www.logikal-software.com/en-au/product/module-overview).

