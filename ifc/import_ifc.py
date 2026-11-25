"""Read IFC window and door instances using IfcOpenShell. SPDX-License-Identifier: MIT."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import math
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"scripts"))
from bridge import write_studio, SCHEMA_VERSION, null_row

def dimension(value,unit_scale):
    if value is None or isinstance(value,bool):return None
    try:
        v=float(value)*unit_scale*1000.0
        return round(v,2) if math.isfinite(v) and v>0 else None
    except (ValueError,TypeError):return None

def scan(model,filename,util_element,unit_scale):
    projects=model.by_type("IfcProject")
    if len(projects)!=1 or not projects[0].GlobalId:
        raise ValueError("Expected a single IfcProject with a GlobalId.")
    project=projects[0]
    rows=[]
    for kind,cls in [("window","IfcWindow"),("door","IfcDoor")]:
        for obj in model.by_type(cls):
            if not obj.GlobalId:
                raise ValueError(f"{cls} #{obj.id()} has no GlobalId.")
            container=util_element.get_container(obj)
            level=util_element.get_container(obj,ifc_class="IfcBuildingStorey")
            typ=util_element.get_type(obj)
            op=getattr(obj,"OperationType",None) if kind=="door" else None
            if op in ("NOTDEFINED","USERDEFINED"):op=None
            rows.append(null_row(id=obj.GlobalId,hostRef=str(obj.id()),kind=kind,
                mark=str(getattr(obj,"Tag",None) or ""),widthMm=dimension(getattr(obj,"OverallWidth",None),unit_scale),
                heightMm=dimension(getattr(obj,"OverallHeight",None),unit_scale),
                dimensionBasis="IFC OverallWidth / OverallHeight",level=str(getattr(level,"Name",None) or ""),
                room=str(getattr(container,"Name",None) or "") if container and container.is_a("IfcSpace") else "",
                operation=str(op or ""),typeName=str(getattr(typ,"Name",None) or getattr(obj,"Name",None) or ""),
                notes=str(getattr(obj,"Description",None) or "")))
    return dict(schemaVersion=SCHEMA_VERSION,source="IFC",projectId=project.GlobalId,
                projectName=project.Name or Path(filename).stem,hostVersion=model.schema,
                capturedAt=datetime.now(timezone.utc).isoformat(),openings=rows,
                warnings=["IFC instance dimensions only; no geometry bounding-box estimates.",
                          "GlobalIds must be retained by exporting software for reliable revision comparison.",
                          "Door operation may use IFC enumeration names; verify supplier handing separately."])
def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("file",type=Path)
    p.add_argument("--output",type=Path)
    p.add_argument("--no-browser",action="store_true")
    a=p.parse_args(argv)
    try:
        import ifcopenshell
        import ifcopenshell.util.element as util_element
        from ifcopenshell.util.unit import calculate_unit_scale
        m=ifcopenshell.open(str(a.file))
        s=scan(m,a.file.name,util_element,calculate_unit_scale(m))
        print(write_studio(s,a.output,not a.no_browser))
        return 0
    except Exception as e:
        print("WinMatch IFC: "+str(e),file=sys.stderr);return 1
if __name__=="__main__":raise SystemExit(main())
