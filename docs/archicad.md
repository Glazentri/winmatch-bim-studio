# Archicad Python Palette companion (source preview)

The Graphisoft JSON API uses a localhost connection to an open Archicad instance. The WinMatch script is an external automation/Palette companion, not a compiled native APX add-on. All scans are read-only.

## Install

1. Install Python with Tkinter (the setup wizard uses it). Check the Graphisoft package supports your Archicad release.
2. Open Archicad and the target project.
3. Open a terminal in the repository and run:

```bash
python -m venv .venv
# Windows PowerShell: .\.venv\Scripts\Activate.ps1
# macOS: source .venv/bin/activate
python -m pip install -r archicad/requirements.txt
python archicad/winmatch_archicad.py --configure
```

If you use Archicad's Python Palette, configure it to use the Python interpreter containing the official `archicad` package. Import the script from the repository without separating it from `scripts/` and `dist/`. Select it and run. On first run the script asks for the mapping.

## Property mapping

Archicad libraries, country templates, property definitions and localisations vary. The setup wizard enumerates the exact available built-in and user-defined property identifiers and lets you choose per window/door category.

- Enter a stable, unique project ID and human-readable name. Reuse the same ID only for revisions of that same project.
- Set the dimension basis (e.g. nominal frame size) according to the actual properties selected.
- Map mark, width and height first, then levels, room, operation, material, etc.
- Use genuine **length** properties for all dimensions. The API reports measurements in SI; length properties are converted from metres to mm. Other types are not guessed.
- The default mark property is offered only when the exact built-in `General_ElementID` is returned by the project. Select a different property when needed.
- Text properties are imported; enum properties and unsupported values remain blank in the preview.
- The profile is written to `~/.winmatch-bim/archicad-profile.json`. Use a distinct profile for each project.

For a terminal-only mapping:

```bash
python archicad/winmatch_archicad.py --list-properties
# Copy and edit archicad/profile.example.json using the returned exact labels.
python archicad/winmatch_archicad.py --profile your-project.json --output ./exports --no-browser
```

The script outputs `snapshot.json` and a standalone HTML document containing the captured project.

## Manufacturer object libraries

Load approved manufacturer GDL objects/libraries using the native Archicad Library Manager (the actual library format varies by product version). Place the correct objects in the model, verify their dimensional properties, then rescan. WinMatch's separate catalogue importer can associate SKU references with openings but does not instantiate or modify GDL geometry.

## Labels and IFC exchange

Use the native Archicad Label tool to configure the desired associative marker. In a floor plan or elevation, select the relevant elements and use **Document > Annotation > Label Selected Elements**. Repeat for other views. This is Archicad's built-in bulk-label command, not automatic placement by the Python companion. Review view-specific labels and identifiers.

For IFC, use File > Save As > IFC with an appropriate IFC Translator for Export, or a Publisher set. Export windows and doors with classifications, relevant properties and dimensions, preserve GlobalIds across equivalent revisions, then run the repository IFC importer. Verify the translated instances and properties; native IFC export is not automated through Python in this preview.

References: [Label Multiple Selected Elements](https://help.graphisoft.com/AC/29/INT/_AC29_Help/070_Documentation/070_Documentation-75.htm), [Export IFC Model](https://help.graphisoft.com/AC/29/INT/_AC29_Help/121_IFC/121_IFC-4.htm).

## Limits

The companion targets Archicad 27–29 for initial validation; no installed host was available in this build environment. Multiple running Archicad instances can affect API connection selection; open the intended instance, verify project identity, and use distinct profiles. Curtain wall panels, hotlink traversal, direct native object insertion, and property write-back are not supported.

References: [JSON Interface](https://archicadapi.graphisoft.com/JSONInterfaceDocumentation/), [official Python API wrapper](https://archicadapi.graphisoft.com/archicadPythonPackage/archicad.html), [native C/C++ Add-On SDK](https://archicadapi.graphisoft.com/getting_started_with_api_development_kit).
