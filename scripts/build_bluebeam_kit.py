"""Build original selectable vector PDF markups for native Revu tool-chest authoring.
Optional build requirements: reportlab and PyMuPDF; not required for Studio.
SPDX-License-Identifier: MIT
"""
from pathlib import Path
from io import BytesIO
import csv
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
import fitz
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"integrations"/"bluebeam"
OUT.mkdir(parents=True,exist_ok=True)
GROUPS=[
 ("Window count & identification",[
  ("Sliding window","WIN-SL","#087e72","circle","ea"),("Awning window","WIN-AW","#087e72","circle","ea"),
  ("Fixed window","WIN-FX","#087e72","circle","ea"),("Casement window","WIN-CS","#087e72","circle","ea"),
  ("Louvre window","WIN-LV","#087e72","circle","ea"),("Double-hung window","WIN-DH","#087e72","circle","ea"),
  ("Tilt-turn window","WIN-TT","#087e72","circle","ea"),("Raked window","WIN-RK","#087e72","circle","ea"),
  ("Arch window","WIN-AR","#087e72","circle","ea"),("Circular window","WIN-CI","#087e72","circle","ea"),
  ("Gas-strut window","WIN-GS","#087e72","circle","ea"),("Window review","WIN-QA","#b16c20","square","ea")]),
 ("Door count & identification",[
  ("Hinged door","DR-HG","#355b95","circle","ea"),("Sliding door","DR-SL","#355b95","circle","ea"),
  ("Stacker door","DR-ST","#355b95","circle","ea"),("Bifold door","DR-BF","#355b95","circle","ea"),
  ("Pocket door","DR-PK","#355b95","circle","ea"),("Corner door","DR-CR","#355b95","circle","ea"),
  ("Pivot door","DR-PV","#355b95","circle","ea"),("Double door","DR-DB","#355b95","circle","ea"),
  ("Bi-parting door","DR-BP","#355b95","circle","ea"),("Security door","DR-SC","#355b95","circle","ea"),
  ("Door threshold","DR-TH","#b16c20","square","ea"),("Door review","DR-QA","#b16c20","square","ea")]),
 ("Quantities & site checks",[
  ("Opening area","QTY-AR","#087e72","square","m²"),("Reveal length","QTY-RV","#087e72","line","lm"),
  ("Lintel over","QTY-LN","#b16c20","line","lm"),("Head flashing","QTY-FL","#355b95","line","lm"),
  ("Subsill","QTY-SS","#7561a2","line","lm"),("Sill / threshold","QTY-TH","#7561a2","line","lm"),
  ("Frame perimeter","QTY-PR","#087e72","square","lm"),("Structural opening","QTY-SO","#b16c20","square","mm"),
  ("Actual unit size","QTY-AU","#355b95","square","mm"),("Curtain wall module","QTY-CW","#7561a2","square","ea"),
  ("Confirm handing","QA-HD","#b16c20","circle","check"),("Confirm dimensions","QA-DM","#b16c20","circle","check")])]
W,H=842,595
buf=BytesIO()
c=canvas.Canvas(buf,pagesize=(W,H))
for idx,(title,items) in enumerate(GROUPS,1):
    c.setFillColor(HexColor("#101820"));c.rect(0,H-85,W,85,fill=1,stroke=0)
    c.setFillColor(HexColor("#63d8c5"));c.setFont("Helvetica-Bold",12);c.drawString(32,H-27,"WINMATCH   |   GLAZENTRI")
    c.setFillColor(HexColor("#ffffff"));c.setFont("Helvetica-Bold",25);c.drawString(32,H-59,title)
    c.setFillColor(HexColor("#40545c"));c.setFont("Helvetica",10);c.drawString(32,H-105,"Selectable PDF markups. In Revu, right-click each markup and add it to your Tool Chest.")
    for i,(name,code,col,shape,unit) in enumerate(items):
        x=32+(i%4)*197;y=145+(i//4)*130
        c.setFillColor(HexColor("#f2f6f5"));c.setStrokeColor(HexColor("#d5e0de"));c.roundRect(x,H-y-115,184,113,8,fill=1,stroke=1)
        c.setFillColor(HexColor("#152a31"));c.setFont("Helvetica-Bold",11);c.drawString(x+12,H-y-78,name)
        c.setFillColor(HexColor("#536970"));c.setFont("Helvetica",9);c.drawString(x+12,H-y-95,code+"  |  "+unit)
    c.setFillColor(HexColor("#536970"));c.setFont("Helvetica",9)
    c.drawString(32,24,"Geometric markers only. Create native Revu calibrated measurement / count tools separately. Do not use this sheet as a scaled drawing.")
    c.drawRightString(W-32,24,f"{idx} / {len(GROUPS)}")
    c.showPage()
c.save()
doc=fitz.open(stream=buf.getvalue(),filetype="pdf")
catalogue=[]
for idx,(title,items) in enumerate(GROUPS):
    page=doc[idx]
    for i,(name,code,color,shape,unit) in enumerate(items):
        x=32+(i%4)*197;y=145+(i//4)*130
        rgb=tuple(int(color[a:a+2],16)/255 for a in (1,3,5))
        if shape=="circle":
            ann=page.add_circle_annot(fitz.Rect(x+71,y+13,x+113,y+55))
            ann.set_colors(stroke=rgb,fill=rgb);ann.set_opacity(.45)
        elif shape=="line":
            ann=page.add_line_annot(fitz.Point(x+48,y+32),fitz.Point(x+137,y+32))
            ann.set_colors(stroke=rgb)
        else:
            ann=page.add_rect_annot(fitz.Rect(x+58,y+13,x+126,y+55))
            ann.set_colors(stroke=rgb);ann.set_opacity(.8)
        ann.set_border(width=2.4)
        ann.set_info(title="WinMatch",subject=name,content=f"{code} | {unit} | Configure label and dimensions for the opening.")
        ann.update()
        catalogue.append((title,name,code,color,shape,unit,"Create a native measurement/count tool in Revu if required."))
doc.save(OUT/"WinMatch_Bluebeam_Tool_Chest_Markups.pdf",deflate=True)
doc.close()
with (OUT/"tool-chest-catalogue.csv").open("w",encoding="utf-8-sig",newline="") as f:
    w=csv.writer(f);w.writerow(["Tool set","Subject","Code","Colour","PDF markup","Unit","Note"]);w.writerows(catalogue)
doc=fitz.open(OUT/"WinMatch_Bluebeam_Tool_Chest_Markups.pdf")
assert len(doc)==3 and sum(len(list(p.annots())) for p in doc)==36
for i,p in enumerate(doc):
    p.get_pixmap(matrix=fitz.Matrix(1.2,1.2),annots=True).save(f"/tmp/wm-bluebeam-{i+1}.png")
print("36 original selectable PDF annotations across 3 tool groups.")
