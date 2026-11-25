"""Pure Python contract tests; no licensed host required."""
from pathlib import Path
from types import SimpleNamespace as NS
import tempfile
import unittest
import sys
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/"archicad"),str(ROOT/"scripts"),str(ROOT/"ifc")]
from bridge import write_studio, null_row
import winmatch_archicad as ac
import import_ifc as ifc

class Commands:
    def GetAllPropertyNames(self):
        return [NS(nonLocalizedName=x) for x in ("General_ElementID","Example_Width","Example_Height")]
    def GetElementsByType(self,kind):
        return [NS(elementId=NS(guid="window-a"))] if kind=="Window" else []
    def GetPropertyIds(self,props):
        return [NS(propertyId=p.nonLocalizedName) for p in props]
    def GetPropertyValuesOfElements(self,elements,ids):
        values={"General_ElementID":("string","W01"),"Example_Width":("length",1.2),"Example_Height":("length",0.9)}
        return [NS(propertyValues=[NS(propertyValue=NS(status="normal",type=values[p][0],value=values[p][1])) for p in ids]) for e in elements]
class TestBridge(unittest.TestCase):
    def test_snapshot_embedding_escapes_script(self):
        with tempfile.TemporaryDirectory() as directory:
            snap={"schemaVersion":"1.0.0","source":"Demo","projectId":"p","projectName":"</script><script>alert(1)</script>","openings":[]}
            p=write_studio(snap,directory,False)
            text=p.read_text()
            self.assertNotIn(snap["projectName"],text)
            self.assertIn(r"\u003c/script\u003e",text)
            self.assertTrue((Path(directory)/"snapshot.json").exists())
    def test_archicad_si_and_missing(self):
        c=NS(commands=Commands(),types=NS(),version="29")
        catalogue=ac.property_catalogue(c)
        fields={"mark":"Built-in: General_ElementID","widthMm":"Built-in: Example_Width","heightMm":"Built-in: Example_Height"}
        s=ac.scan(c,{"projectId":"p","projectName":"Test","dimensionBasis":"Nominal","window":fields,"door":{}},catalogue)
        self.assertEqual(s["openings"][0]["widthMm"],1200)
        self.assertEqual(s["openings"][0]["heightMm"],900)
        self.assertEqual(s["openings"][0]["mark"],"W01")
        self.assertEqual(s["openings"][0]["id"],"window-a")
        self.assertEqual(ac.unwrap(NS(propertyValue=NS(status="normal",type="number",value=1200)),"widthMm"),None)
        self.assertEqual(ac.unwrap(NS(propertyValue=NS(status="notAvailable",type="length")),"widthMm"),None)
    def test_ifc_units_and_nulls(self):
        self.assertEqual(ifc.dimension(1200,0.001),1200)
        self.assertEqual(ifc.dimension(1.2,1),1200)
        self.assertAlmostEqual(ifc.dimension(4,0.3048),1219.2)
        self.assertIsNone(ifc.dimension(None,1))
        self.assertIsNone(ifc.dimension(float("nan"),1))

if __name__=="__main__":unittest.main()
