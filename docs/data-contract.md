# Snapshot contract v1.0.0

See [snapshot.schema.json](../schema/snapshot.schema.json) and [example snapshot](examples/snapshot.json).

A snapshot contains source, projectId, projectName, capturedAt and openings. Host element IDs must be stable within the project and unique. Width/height are millimetres; unknown dimensions are null. Strings may be blank. Each opening represents one physical model instance (quantity 1).

| Property | Meaning |
|---|---|
| id / hostRef | Stable source ID and optional local numeric or display reference |
| kind / mark | window or door, optional human-facing mark |
| widthMm / heightMm / dimensionBasis | Model dimension pair and provenance |
| openingWidthMm / openingHeightMm | Independently confirmed structural aperture |
| actualWidthMm / actualHeightMm | Independently confirmed unit size |
| subsillDepthMm / subsillHeightMm / subsillLengthMm / revealDepthMm | Optional confirmed detail dimensions |
| level / room / typeName / orientation | Model context |
| operation / handing / material / glazing / series / colour / hardware | Specification metadata |
| manufacturer / sku / notes | Product association and additional notes |
| sillMm | Optional sill height |
| revealMode / lintelIncluded / flashingIncluded | Quantity configuration |
| priceMode / supplyRate / installRate | Local pricing metadata, nullable monetary numbers |

Snapshot-level optional objects are quantitySettings, priceSettings, curtainWalls, curtainDesign, and siteContext. New consumers should ignore unknown fields and preserve extensions where possible. The current Studio normalises known fields and may omit unknown extensions on re-export.

Revision comparison requires matching source and projectId and equivalent selection scope. Stable opening IDs are the key; no fuzzy mark matches. Changes are opening-level fields; settings at snapshot level are not listed in the comparison.

Mark-update patches are separate files (see [mark-patch.schema.json](../schema/mark-patch.schema.json)). Revit checks project, schema, element identity and expected mark before any update. No dimension or arbitrary parameter patch is accepted.

The JSON format is an open interchange, not a verified import format for the live WinMatch web platform or a native IFC replacement. Integrators can map to their target API after validating the exact current endpoint contract.
