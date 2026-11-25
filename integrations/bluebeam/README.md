# Bluebeam Revu tool-chest authoring pack

This pack includes **36 original selectable PDF annotations** (window, door and quantity/site-check subjects), a tool-set catalogue, and a sample CSV markup export. It is designed to turn into three native tool sets using Revu itself.

## Create the tool chests

1. Open `WinMatch_Bluebeam_Tool_Chest_Markups.pdf` in Revu.
2. Open Tool Chest > Manage Tool Sets. Create:
   - WinMatch - Window Count and Identification
   - WinMatch - Door Count and Identification
   - WinMatch - Quantities and Site Checks
3. Click each selectable markup on the corresponding page and use Add to Tool Chest (or create your preferred native markup with its subject, colour and label from `tool-chest-catalogue.csv`).
4. Configure native count, length or area measurement tools where measurements are needed. The annotated PDF contains ordinary standard PDF line/rectangle/circle markups, not Revu-calibrated measurements; calibrate the actual drawing and choose the correct Revu measurement units.
5. Add custom Markups List columns for Label/Mark, Width, Height, Count, Level and Room; use explicit millimetres for Width/Height. Add notes and page reference.
6. In Tool Chest select the tool set's Properties > Export, creating a native .btx for your version of Revu. Import through Manage Tool Sets in a clean test profile and verify subjects, colours, labels and measurement behaviour.

The native .btx file is intentionally not fabricated or claimed host-tested in this source release. Revu's own export is the authoritative generator.

## WinMatch CSV bridge

Export the Markups List as CSV with `Subject,Label,Count,Width,Height,Page Label,Comments` (see sample). In Studio > Estimating bridges, assign a project ID and import. The bridge recognises window and door subjects, requires positive explicit width and height in mm, and expands count to individual opening rows. IDs are derived from the input row and occurrence, not stable BIM identifiers. Non-window/door quantity markup rows are excluded; check completeness and compare against the original drawing.

Reference: [Bluebeam Revu Tool Chest guide](https://support.bluebeam.com/revu/features/tool-chest-guide.html) and [sharing tool sets](https://support.bluebeam.com/revu/how-to/share-tool-sets.html).
