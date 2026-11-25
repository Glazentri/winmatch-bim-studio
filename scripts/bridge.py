"""Shared local-only snapshot launcher. SPDX-License-Identifier: MIT."""
import json
import tempfile
from pathlib import Path
from urllib.parse import urlparse
import webbrowser

ROOT = Path(__file__).resolve().parents[1]
SCHEMA_VERSION = "1.0.0"

def write_studio(snapshot, output=None, open_browser=True):
    """Embed data without allowing model names or parameters to end the script tag."""
    folder = Path(output) if output else Path(tempfile.mkdtemp(prefix="winmatch-bim-"))
    folder.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(snapshot, ensure_ascii=True, indent=2, allow_nan=False)
    (folder / "snapshot.json").write_text(serialized, encoding="utf-8")
    safe = serialized.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    template = (ROOT / "dist" / "WinMatch-BIM-Studio.html").read_text(encoding="utf-8")
    marker = "const EMBEDDED = null;"
    if template.count(marker) != 1:
        raise ValueError("Invalid generated Studio. Run scripts/build_studio.py.")
    html = folder / "WinMatch-BIM-Studio.html"
    html.write_text(template.replace(marker, f"const EMBEDDED = {safe};"), encoding="utf-8")
    if open_browser:
        webbrowser.open(html.resolve().as_uri())
    return html

def null_row(**kwargs):
    row = dict(id="", hostRef="", kind="", mark="", widthMm=None, heightMm=None,
               sillMm=None, openingWidthMm=None, openingHeightMm=None, actualWidthMm=None, actualHeightMm=None, subsillDepthMm=None, subsillHeightMm=None, subsillLengthMm=None, revealDepthMm=None, level="", room="", typeName="", operation="", material="",
               glazing="", orientation="", handing="", series="", colour="", hardware="",
               manufacturer="", sku="", notes="", dimensionBasis="Unspecified")
    row.update(kwargs)
    return row
