# Revit connector (source preview)

## Installation

- Target: Revit 2025 / 2026, Windows, .NET 8 SDK. Compile against the API DLLs from the corresponding installed Revit version.
- Revit must be closed. Do not copy Autodesk DLLs into the repository.
- From the repository root, run `powershell -File .\revit\install.ps1 -Version 2026` (or 2025). If PowerShell blocks scripts, consult your organisation's standard trusted-script workflow; do not bypass organisational restrictions.
- This builds the add-in, copies its output and the standalone HTML to your user's LocalAppData, then registers an application manifest in your user's Revit Addins folder.
- Restart Revit and locate **WinMatch > BIM Studio**.
- Uninstall registration with `powershell -File .\revit\uninstall.ps1 -Version 2026`, then restart. Local application and project export files remain.

## Native actions

| Ribbon action | Behaviour |
|---|---|
| Open Studio | Scans native `OST_Windows` and `OST_Doors` family instances in the current document. |
| Selected openings | Scans only current selected windows/doors. |
| Locate by mark | Prompts for an exact mark, selects matches and asks Revit to show elements. |
| Export IFC | Review destination; request IFC4 and standard base quantities through Revit's exporter. |
| Auto-tag views | Select floor plans, elevations or both; preview and create category tags, skipping existing tags and blank marks. |
| Load RFA library | Imports trusted local .rfa window/door family definitions; rejects replacement via family-load callbacks and rolls back on failure. No automatic placement. |
| Apply marks | Imports a mark-update patch, previews changes, validates current values and model ID, then commits one undoable transaction. |

Open Studio launches a local HTML document in the default browser; it is not yet a dockable WPF palette. No network service is needed.

## Data extraction

- Element identity: `UniqueId`; host reference: numeric ElementId.
- Project identity: ProjectInformation's UniqueId. Save As and copied models may preserve identity; review the target document name before applying a patch from a branched model.
- Width and height: Revit family width/height built-in parameters, instance first and type fallback. Revit internal lengths are converted with `UnitUtils` to mm.
- Sill uses the window instance parameter. Unknown values remain blank.
- Room association is based on Revit's instance room/door room association; phase-dependent results may be missing. Door room uses ToRoom with FromRoom fallback.
- Model level and type name are extracted. Other fields (operation, handing, glass, finish, series) are explicitly editable in Studio, not inferred from family names.
- Curtain walls are summarised separately (wall curve length, unconnected-height parameter, grid/panel/mullion counts). Linked documents, nested non-category elements, detailed curtain-panel geometry, demolished/phase-specific filtering, and arbitrary shared parameters are not implemented in this preview.

## Auto-label floor plans and elevations

Load preferred window/door category tag families whose labels read the Mark parameter. Click Auto-tag views; select individual views or the Floor plans / Elevations / Both shortcuts. Preview the count. The command skips existing local tags and blank marks, places native category tags at an approximate view-space location plus a 4 mm paper-space offset, and commits one undoable transaction. It does not perform collision avoidance, tag type selection, or sheet layout optimisations. Verify graphics and tag contents in each view; Revit's default loaded category tag type is used.

## IFC export

Click Export IFC and choose a new local .ifc destination. The command requests IFC4 and base quantities using the documented Revit API. The export transaction is rolled back to avoid incidental source model changes; verify exporter behaviour and emitted file in the target Revit version. Use the separate IfcOpenShell importer for WinMatch. A more advanced workflow may need the native IFC exporter settings dialog.

## Model mark round-trip

1. Open Studio from Revit.
2. Edit a mark or suggest missing marks. Keep all dimensions unchanged.
3. Export > Download mark patch.
4. In Revit, **Apply marks**, select the JSON.
5. Review the number of updates and preview. Revit rejects missing elements, read-only marks, non-matching project/schema, stale expected marks or duplicate patch IDs.
6. Confirm and rescan. Use Revit Undo to reverse the transaction if appropriate.

Repeated marks can be intentional and are not automatically removed. Other Studio fields are schedule data only. A patch is not a general model edit file.

## Manufacturer family definitions

Obtain approved RFA files from the manufacturer or trusted repository. In Revit choose Load RFA library, select the files, review and confirm. Native family loading may encounter incompatible versions, permission/worksharing limitations or duplicate family names. On load failure the transaction is rolled back. Load definitions only; use native Revit placement and family type controls, then rescan.

## Release verification

Build against each installed target and execute the host matrix in [release-checklist.md](release-checklist.md). No compiled Revit DLL is shipped.

Reference: [Autodesk Revit API SDK and help](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API/files/Revit_API_Developers_Guide/Introduction/Getting_Started/Using_the_Autodesk_Revit_API/Revit_API_Revit_API_Developers_Guide_Introduction_Getting_Started_Using_the_Autodesk_Revit_API_html.html), [Add-in registration](https://help.autodesk.com/cloudhelp/2026/ENU/Revit-API/files/Revit_API_Developers_Guide/Introduction/Add_In_Integration/Revit_API_Revit_API_Developers_Guide_Introduction_Add_In_Integration_Add_In_Registration_html.html).
