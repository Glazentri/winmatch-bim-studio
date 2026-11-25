from pathlib import Path
root = Path(__file__).resolve().parents[1]
template = (root / "studio/index.template.html").read_text(encoding="utf-8")
core = (root / "studio/core.js").read_text(encoding="utf-8")
assert template.count("/*__CORE__*/") == 1
assert template.count("const EMBEDDED = null;") == 1
(root / "dist").mkdir(exist_ok=True)
(root / "dist/WinMatch-BIM-Studio.html").write_text(template.replace("/*__CORE__*/", core), encoding="utf-8")
print("Built offline studio.")
