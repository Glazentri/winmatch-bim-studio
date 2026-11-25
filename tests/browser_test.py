"""Run with Python Playwright + Chromium. Offline demo smoke and responsive tests."""
import json
from pathlib import Path
import os
import tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
URL=(ROOT/"dist"/"WinMatch-BIM-Studio.html").as_uri()
with sync_playwright() as p:
    exe=os.environ.get("CHROMIUM_PATH") or ("/usr/bin/chromium" if Path("/usr/bin/chromium").exists() else None)
    browser=p.chromium.launch(executable_path=exe,headless=True,args=["--no-sandbox"])
    context=browser.new_context(accept_downloads=True,viewport={"width":1440,"height":900})
    page=context.new_page()
    errors=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.on("dialog",lambda d:d.accept())
    page.goto(URL)
    assert page.get_by_role("heading",name="Window & door schedule").is_visible()
    assert page.locator(".row:not(.header)").count()==16
    page.get_by_role("searchbox").fill("W01")
    assert page.locator(".row:not(.header)").count()==1
    page.get_by_role("searchbox").fill("")
    page.get_by_role("button",name="Suggest missing marks").click()
    assert page.locator(".row:not(.header)").count()==16
    def go(name):
        page.locator("#nav").get_by_role("button",name=name,exact=True).click()
    go("Model review")
    assert page.get_by_role("heading",name="Review queue").is_visible()
    go("Type catalogue")
    assert page.get_by_role("heading",name="Unique configurations").is_visible()
    go("Revision compare")
    page.get_by_role("button",name="Load example revision").click()
    assert page.get_by_role("heading",name="Revision differences").is_visible()
    go("Manufacturer library")
    page.get_by_role("button",name="Sample library").click()
    page.get_by_label("Opening",exact=True).select_option("demo-1")
    assert page.get_by_text("EX-SL-1812",exact=False).count()==1
    page.get_by_role("button",name="Associate SKU").first.click()
    go("Sheet designer")
    assert page.locator(".sheet-card").count()==16
    page.get_by_label("Sheet title",exact=True).fill("Test branded schedule")
    assert page.locator(".sheet-title h2").inner_text()=="Test branded schedule"
    page.get_by_label("Layout",exact=True).select_option("table")
    assert page.locator(".sheet-table tbody tr").count()==16
    with page.expect_download() as d:
        page.get_by_role("button",name="Save sheet template").click()
    assert d.value.suggested_filename.endswith(".json")
    go("Measured quantities")
    page.get_by_role("button",name="Include all lintels").click()
    assert page.get_by_role("heading",name="Per-opening quantities").is_visible()
    go("Pricing")
    assert page.get_by_role("heading",name="Estimate assumptions").is_visible()
    go("Curtain wall")
    assert page.locator("[data-cell]").count()==6
    go("Site climate")
    assert page.get_by_role("heading",name="Solar compass").is_visible()
    go("Estimating bridges")
    assert page.get_by_role("heading",name="Databuild QGen variable carrier").is_visible()
    go("Export")
    with page.expect_download() as d:
        page.get_by_role("button",name="Download CSV",exact=True).click()
    assert d.value.suggested_filename.endswith(".csv")
    with page.expect_download() as d:
        page.get_by_role("button",name="Download mapped CSV").click()
    assert d.value.suggested_filename.endswith(".csv")
    with page.expect_download() as d:
        page.get_by_role("button",name="Download JSON",exact=True).click()
    assert d.value.suggested_filename.endswith(".json")
    # Verify all named screens have no page-wide horizontal overflow in 7 layouts.
    for width in [320,375,768,1024,1280,1440,1920]:
        page.set_viewport_size({"width":width,"height":900})
        nav="#mobileNav" if width<=550 else "#nav"
        for name in ["Schedule","Model review","Type catalogue","Manufacturer library","Sheet designer","Measured quantities","Pricing","Curtain wall","Site climate","Estimating bridges","Revision compare","Export"]:
            page.locator(nav).get_by_role("button",name=name,exact=True).click()
            over=page.evaluate("document.documentElement.scrollWidth-innerWidth")
            assert over<=2,(width,name,over)
    page.set_viewport_size({"width":1440,"height":900})
    go("Schedule")
    page.get_by_role("button",name="Toggle light or dark theme").click()
    assert page.locator("html").get_attribute("data-theme")=="dark"
    page.get_by_role("button",name="Toggle light or dark theme").click()
    assert not errors,errors
    if os.environ.get("SCREENSHOT_DIR"):
        out=Path(os.environ["SCREENSHOT_DIR"]);out.mkdir(exist_ok=True)
        page.screenshot(path=str(out/"schedule.png"),full_page=False)
        go("Sheet designer");page.get_by_label("Layout",exact=True).select_option("cards")
        page.screenshot(path=str(out/"sheet.png"),full_page=False)
    print("PASS: demo interactions, exports, catalogue matching, designer, revision comparison, theme and 84 viewport/screen combinations.")
    browser.close()
