"""Archicad Python Palette companion, also callable from a terminal.
SPDX-License-Identifier: MIT
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from bridge import SCHEMA_VERSION, write_studio, null_row

FIELDS = ("mark", "widthMm", "heightMm", "level", "room", "typeName", "operation",
          "handing", "material", "glazing", "orientation", "sillMm", "series", "colour",
          "hardware", "manufacturer", "sku", "notes", "openingWidthMm", "openingHeightMm", "actualWidthMm", "actualHeightMm", "subsillDepthMm", "subsillHeightMm", "subsillLengthMm", "revealDepthMm")
DIMENSIONS = {"widthMm", "heightMm", "sillMm", "openingWidthMm", "openingHeightMm", "actualWidthMm", "actualHeightMm", "subsillDepthMm", "subsillHeightMm", "subsillLengthMm", "revealDepthMm"}
PROFILE = Path.home() / ".winmatch-bim" / "archicad-profile.json"

def property_catalogue(conn):
    names = {}
    for p in conn.commands.GetAllPropertyNames():
        native = getattr(p, "nonLocalizedName", None)
        localized = getattr(p, "localizedName", None)
        if native:
            names[f"Built-in: {native}"] = p
        elif localized and len(localized) == 2:
            names[f"Property: {localized[0]} / {localized[1]}"] = p
    return dict(sorted(names.items()))

def unwrap(entry, field):
    """Only interpret real API length values as metres; never guess a text or scalar unit."""
    try:
        p = entry.propertyValue
        if p.status != "normal":
            return None if field in DIMENSIONS else ""
        value = p.value
        if field in DIMENSIONS:
            if p.type != "length" or isinstance(value, bool) or not isinstance(value, (int, float)):
                return None
            val = float(value) * 1000
            return round(val, 2) if math.isfinite(val) and (val >= 0 if field == "sillMm" else val > 0) else None
        if isinstance(value, str):
            return value.strip()
        # Enum and unsupported values are intentionally left unknown.
        return ""
    except (AttributeError, TypeError):
        return None if field in DIMENSIONS else ""

def scan(conn, profile, catalogue):
    project_id = str(profile.get("projectId", "")).strip()
    project_name = str(profile.get("projectName", "")).strip()
    if not project_id or not project_name:
        raise ValueError("Set a unique stable project ID and project name first.")
    warnings = ["Window and Door element types in the active Archicad plan only; curtain wall panels are not included.",
                "Only mapped API properties of length type are converted from metres to millimetres. Unknown values are blank. No model geometry is altered."]
    rows = []
    acc = conn.commands
    act = conn.types
    for kind in ("window", "door"):
        mapping = profile.get(kind, {})
        elements = acc.GetElementsByType(kind.capitalize())
        fields, ids = [], []
        for field in FIELDS:
            label = mapping.get(field, "")
            if not label:
                continue
            if label not in catalogue:
                warnings.append(f"{kind}: mapped property not present: {label}")
                continue
            result = acc.GetPropertyIds([catalogue[label]])[0]
            pid = getattr(result, "propertyId", None)
            if pid is None:
                warnings.append(f"{kind}: unresolved property: {label}")
            else:
                fields.append(field)
                ids.append(pid)
        for start in range(0, len(elements), 250):
            chunk = elements[start:start+250]
            values = acc.GetPropertyValuesOfElements(chunk, ids) if ids else [None]*len(chunk)
            if len(values) != len(chunk):
                raise RuntimeError("Archicad returned unexpected property row count. Scan aborted.")
            for item, record in zip(chunk, values):
                guid = str(item.elementId.guid)
                row = null_row(id=guid, hostRef=guid, kind=kind,
                               dimensionBasis=str(profile.get("dimensionBasis", "")).strip() or "Unspecified")
                props = getattr(record, "propertyValues", None) or []
                if len(props) == len(fields):
                    for field, value in zip(fields, props):
                        row[field] = unwrap(value, field)
                rows.append(row)
        if elements and not all(f in fields for f in ("widthMm", "heightMm")):
            warnings.append(f"{kind}: map width and height properties in the profile.")
    if not rows:
        warnings.append("The active plan returned no window or door elements.")
    return {"schemaVersion": SCHEMA_VERSION, "source": "Archicad", "projectId": project_id,
            "projectName": project_name, "hostVersion": str(getattr(conn, "version", "")),
            "capturedAt": datetime.now(timezone.utc).isoformat(), "warnings": warnings, "openings": rows}

def configure(catalogue, saved):
    """First-run wizard: exact names, user-confirmed dimension basis, no inferred assignments."""
    import tkinter as tk
    from tkinter import ttk, messagebox
    root = tk.Tk()
    root.title("WinMatch | Archicad property mapping")
    root.geometry("900x720")
    root.minsize(650, 440)
    root.columnconfigure(0, weight=1)
    root.rowconfigure(1, weight=1)
    title = ttk.Frame(root, padding=14)
    title.grid(row=0,column=0,sticky="ew")
    ttk.Label(title,text="Connect your Archicad model",font=("Arial",19,"bold")).grid(row=0,column=0,columnspan=2,sticky="w")
    ttk.Label(title,text="Choose the exact properties used by your model. Width/height must be length properties in Archicad.").grid(row=1,column=0,columnspan=2,sticky="w")
    keys = {}
    for i,(key,label) in enumerate([("projectId","Stable project ID"),("projectName","Project name"),("dimensionBasis","Dimension basis (e.g. nominal frame size)")],2):
        var = tk.StringVar(value=saved.get(key,""))
        keys[key]=var
        ttk.Label(title,text=label).grid(row=i,column=0,sticky="w",pady=3)
        ttk.Entry(title,textvariable=var,width=45).grid(row=i,column=1,sticky="ew",padx=10,pady=3)
    book=ttk.Notebook(root)
    book.grid(row=1,column=0,sticky="nsew",padx=14)
    vars_={}
    options=[""]+list(catalogue)
    for kind in ("window","door"):
        tab=ttk.Frame(book)
        book.add(tab,text=kind.capitalize()+" properties")
        tab.columnconfigure(0,weight=1)
        tab.rowconfigure(0,weight=1)
        canvas=tk.Canvas(tab,highlightthickness=0)
        scroll=ttk.Scrollbar(tab,orient="vertical",command=canvas.yview)
        frame=ttk.Frame(canvas,padding=10)
        frame.columnconfigure(1,weight=1)
        window=canvas.create_window((0,0),window=frame,anchor="nw")
        frame.bind("<Configure>",lambda event,c=canvas:c.configure(scrollregion=c.bbox("all")))
        canvas.bind("<Configure>",lambda event,c=canvas,w=window:c.itemconfigure(w,width=event.width))
        canvas.configure(yscrollcommand=scroll.set)
        canvas.grid(row=0,column=0,sticky="nsew")
        scroll.grid(row=0,column=1,sticky="ns")
        vars_[kind]={}
        for i,field in enumerate(FIELDS):
            default="Built-in: General_ElementID" if field=="mark" and "Built-in: General_ElementID" in catalogue else ""
            v=tk.StringVar(value=saved.get(kind,{}).get(field,default))
            vars_[kind][field]=v
            ttk.Label(frame,text=field).grid(row=i,column=0,sticky="w",padx=4,pady=4)
            combo=ttk.Combobox(frame,textvariable=v,values=options,width=55)
            combo.grid(row=i,column=1,sticky="ew",padx=6,pady=4)
            # Type any substring to filter the dropdown, then select an exact property name.
            def filt(event, widget=combo):
                q=widget.get().casefold()
                widget["values"]=[""]+[x for x in catalogue if q in x.casefold()]
            combo.bind("<KeyRelease>",filt)
    final={}
    def save():
        result={k:v.get().strip() for k,v in keys.items()}
        if not result["projectId"] or not result["projectName"]:
            messagebox.showerror("Project details","Enter a project ID and name. Use the same ID for revisions.")
            return
        for kind,mapping in vars_.items():
            result[kind]={f:v.get().strip() for f,v in mapping.items()}
            bad=[v for v in result[kind].values() if v and v not in catalogue]
            if bad:
                messagebox.showerror("Property mapping","Choose an exact property from the dropdown: "+bad[0]);return
        if any(not result[k].get(f) for k in ("window","door") for f in ("widthMm","heightMm")):
            if not messagebox.askyesno("Incomplete dimensions","Some width/height properties are not mapped. Missing dimensions will be flagged. Continue?"):return
        final.update(result);root.destroy()
    footer=ttk.Frame(root,padding=14)
    footer.grid(row=2,column=0,sticky="ew")
    ttk.Button(footer,text="Save mapping & scan model",command=save).pack(side="right")
    ttk.Button(footer,text="Cancel",command=root.destroy).pack(side="right",padx=6)
    root.mainloop()
    return final or None

def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--profile",type=Path,default=PROFILE)
    parser.add_argument("--configure",action="store_true",help="Open property-mapping wizard.")
    parser.add_argument("--list-properties",action="store_true")
    parser.add_argument("--output",type=Path,help="Directory for snapshot and standalone Studio")
    parser.add_argument("--no-browser",action="store_true")
    args=parser.parse_args(argv)
    try:
        from archicad import ACConnection
        conn=ACConnection.connect()
        if not conn:
            raise RuntimeError("Start Archicad and open the target project before scanning.")
        cat=property_catalogue(conn)
        if args.list_properties:
            print("\n".join(cat));return 0
        profile=json.loads(args.profile.read_text(encoding="utf-8")) if args.profile.exists() else {}
        if args.configure or not profile:
            profile=configure(cat,profile)
            if not profile: return 0
            args.profile.parent.mkdir(parents=True,exist_ok=True)
            args.profile.write_text(json.dumps(profile,indent=2),encoding="utf-8")
        snap=scan(conn,profile,cat)
        out=write_studio(snap,args.output,not args.no_browser)
        print(f"{len(snap['openings'])} opening(s). Studio: {out}")
        return 0
    except ImportError as e:
        print(f"Missing dependency: {e}. Install the official archicad Python package and Tk if required.",file=sys.stderr);return 1
    except Exception as e:
        print("WinMatch: "+str(e),file=sys.stderr);return 1
if __name__=="__main__":
    raise SystemExit(main())
