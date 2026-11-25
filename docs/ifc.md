# IFC bridge

IfcOpenShell is an optional separately installed open-source BIM library.

```bash
python -m pip install -r ifc/requirements.txt
python ifc/import_ifc.py model.ifc --output ./exports --no-browser
```

Open the resulting HTML document or import the snapshot into the offline Studio. Use one `IfcProject` per file. `IfcWindow` and `IfcDoor` instance GlobalIds are preserved. `OverallWidth` and `OverallHeight` are interpreted in the model's length units, converted using IfcOpenShell's unit scale and recorded in millimetres. Missing dimensions stay null. Type, tag, container and storey are read when available; no geometric shape recognition or opening bounding-box approximation is performed.

Revisions can be compared only when exports preserve the same project GlobalId and element GlobalIds. File-level changes or regenerating GUIDs will appear as removal/addition. This bridge does not modify IFC.

Reference: [IfcOpenShell](https://ifcopenshell.org/) and [Python API documentation](https://docs.ifcopenshell.org/).
