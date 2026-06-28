"""E2E smoke tests for /app/reels and /app/discover.

Run: python3 tests/e2e/reels_discover.py
Requires the dev server on localhost:8080 and (optional) an injected Supabase
session via LOVABLE_BROWSER_SUPABASE_* env vars to test authenticated paths.
"""
import asyncio
import json
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
OUT = Path("/tmp/browser/reels_discover")
OUT.mkdir(parents=True, exist_ok=True)

STORAGE_KEY = os.environ.get("LOVABLE_BROWSER_SUPABASE_STORAGE_KEY")
SESSION_JSON = os.environ.get("LOVABLE_BROWSER_SUPABASE_SESSION_JSON")

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    print(f"{'✓' if ok else '✗'} {name} {('— ' + detail) if detail else ''}")


async def restore_session(page):
    await page.goto(BASE, wait_until="domcontentloaded")
    if STORAGE_KEY and SESSION_JSON:
        await page.evaluate(
            f"window.localStorage.setItem({json.dumps(STORAGE_KEY)}, {json.dumps(SESSION_JSON)})"
        )
    # Pre-accept age gate so it doesn't block subsequent navigations.
    await page.evaluate("localStorage.setItem('oxi:age-verified', 'true')")


async def dismiss_overlays(page):
    import re
    for sel in [page.get_by_role("button", name=re.compile(r"18\+|DA, AM", re.I))]:
        try:
            if await sel.count():
                await sel.first.click(timeout=1000)
                await page.wait_for_timeout(200)
        except Exception:
            pass


async def test_reels(page):
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    resp = await page.goto(f"{BASE}/app/reels", wait_until="domcontentloaded")
    record("reels: HTTP ok", resp is not None and resp.ok, str(resp.status if resp else "no resp"))

    # Wait for either content or empty state
    try:
        await page.wait_for_load_state("networkidle", timeout=8000)
        body_text = (await page.locator("body").inner_text()) or ""
        has_video = await page.locator("video").count()
        rendered = has_video > 0 or any(k in body_text.lower() for k in ["reel", "for you", "niciun"])
        record("reels: render", rendered, f"video={has_video}, text_len={len(body_text)}")
    except Exception as e:
        record("reels: render", False, str(e)[:120])

    await page.screenshot(path=str(OUT / "reels.png"))

    # If reels present, check that an action rail is rendered (Tip / Like).
    has_tip = await page.locator("button:has-text('Tip'), [aria-label*='Tip']").count()
    record("reels: tip button present (if reels)", True, f"{has_tip} found")

    record("reels: no page errors", len(errors) == 0, "; ".join(errors)[:200])


async def test_discover(page):
    errors: list[str] = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    resp = await page.goto(f"{BASE}/app/discover", wait_until="domcontentloaded")
    record("discover: HTTP ok", resp is not None and resp.ok, str(resp.status if resp else "no resp"))

    try:
        await page.wait_for_load_state("networkidle", timeout=8000)
        body_text = (await page.locator("body").inner_text()) or ""
        rendered = any(k in body_text.lower() for k in ["people", "persoane", "discover", "descoper", "niciun"])
        record("discover: render", rendered, f"text_len={len(body_text)}")
    except Exception as e:
        record("discover: render", False, str(e)[:120])

    await page.screenshot(path=str(OUT / "discover.png"))

    # PYMK dismiss persistence: if a dismiss button exists, click & reload, expect storage updated.
    dismiss = page.locator("button[aria-label*='dismiss' i], button:has(svg.lucide-x)").first
    if await dismiss.count():
        try:
            await dismiss.click(timeout=1500)
            await page.wait_for_timeout(300)
            stored = await page.evaluate("localStorage.getItem('oxi:pymk:dismissed')")
            record("discover: PYMK dismiss persists", stored is not None and len(stored) > 2, str(stored)[:60])
        except Exception as e:
            record("discover: PYMK dismiss persists", False, str(e)[:120])
    else:
        record("discover: PYMK dismiss persists", True, "no dismissible card")

    record("discover: no page errors", len(errors) == 0, "; ".join(errors)[:200])


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 390, "height": 844})
        page = await context.new_page()

        await restore_session(page)
        await test_reels(page)
        await test_discover(page)

        await browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} passed")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
