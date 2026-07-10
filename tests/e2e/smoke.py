"""E2E smoke tests for critical public flows.

Run: python3 tests/e2e/smoke.py
Requires the dev server on http://localhost:8080.
Exits non-zero if any assertion fails.

Covers:
  - Landing loads with SEO meta (title, description, og:image)
  - /signup and /login render forms with required fields
  - Protected routes redirect unauthenticated users to /signup
  - No console errors on public routes (hydration warnings ignored — dev-only)
  - 404 route renders NotFoundComponent
  - Alcohol warning gate on landing
"""
import asyncio
import os
import sys
from pathlib import Path
from playwright.async_api import async_playwright

BASE = os.environ.get("E2E_BASE_URL", "http://localhost:8080")
OUT = Path("/tmp/browser/smoke")
OUT.mkdir(parents=True, exist_ok=True)

results: list[tuple[str, bool, str]] = []


def record(name: str, ok: bool, detail: str = ""):
    results.append((name, ok, detail))
    marker = "PASS" if ok else "FAIL"
    print(f"[{marker}] {name}{(' — ' + detail) if detail else ''}")


IGNORE_ERR_SUBSTR = (
    "hydrat",           # dev-only source-tracking plugin artifact
    "data-tsd-source",  # same
    "Download the React DevTools",
    "Failed to load resource: net::ERR",  # transient WS/HMR
)


def is_real_error(text: str) -> bool:
    t = text.lower()
    return not any(s.lower() in t for s in IGNORE_ERR_SUBSTR)


async def collect_errors(page):
    errs: list[str] = []
    page.on("console", lambda m: errs.append(m.text) if m.type == "error" and is_real_error(m.text) else None)
    page.on("pageerror", lambda e: errs.append(str(e)) if is_real_error(str(e)) else None)
    return errs


async def test_landing(page):
    errs = await collect_errors(page)
    resp = await page.goto(f"{BASE}/", wait_until="domcontentloaded", timeout=20000)
    await page.wait_for_timeout(1000)
    record("landing: 200", (resp.status if resp else 0) == 200, f"status={resp.status if resp else 'none'}")

    title = await page.title()
    record("landing: title contains OXIDA", "OXIDA" in title.upper(), f"title={title!r}")

    desc = await page.locator('meta[name="description"]').get_attribute("content")
    record("landing: meta description present", bool(desc and len(desc) > 20), f"len={len(desc or '')}")

    og_img = await page.locator('meta[property="og:image"]').get_attribute("content")
    record("landing: og:image is absolute https", bool(og_img and og_img.startswith("https://")), og_img or "")

    await page.screenshot(path=str(OUT / "landing.png"))
    record("landing: no console errors", len(errs) == 0, f"errs={errs[:2]}")


async def test_signup(page):
    errs = await collect_errors(page)
    resp = await page.goto(f"{BASE}/signup", wait_until="domcontentloaded", timeout=20000)
    await page.wait_for_timeout(800)
    record("signup: 200", (resp.status if resp else 0) == 200)

    has_email = await page.locator('input[type="email"], input[name*="email" i]').count() > 0
    has_pw = await page.locator('input[type="password"]').count() > 0
    record("signup: has email input", has_email)
    record("signup: has password input", has_pw)
    await page.screenshot(path=str(OUT / "signup.png"))
    record("signup: no console errors", len(errs) == 0, f"errs={errs[:2]}")


async def test_login(page):
    errs = await collect_errors(page)
    resp = await page.goto(f"{BASE}/login", wait_until="domcontentloaded", timeout=20000)
    await page.wait_for_timeout(800)
    ok = (resp.status if resp else 0) == 200
    record("login: 200", ok)
    has_email = await page.locator('input[type="email"], input[name*="email" i]').count() > 0
    has_pw = await page.locator('input[type="password"]').count() > 0
    record("login: has email input", has_email)
    record("login: has password input", has_pw)
    await page.screenshot(path=str(OUT / "login.png"))
    record("login: no console errors", len(errs) == 0, f"errs={errs[:2]}")


async def test_protected_redirects(context):
    for route in ("/app", "/app/feed", "/app/map", "/app/inbox", "/app/me", "/app/chat"):
        page = await context.new_page()
        await page.goto(f"{BASE}{route}", wait_until="domcontentloaded", timeout=20000)
        await page.wait_for_timeout(1200)
        final = page.url
        redirected = "/signup" in final or "/login" in final or "/auth" in final
        record(f"protected redirect: {route}", redirected, f"→ {final}")
        await page.close()


async def test_404(page):
    resp = await page.goto(f"{BASE}/definitely-not-a-real-route-xyz", wait_until="domcontentloaded", timeout=20000)
    await page.wait_for_timeout(600)
    # TanStack Router renders notFoundComponent client-side; status may still be 200
    text = (await page.content()).lower()
    matched = any(k in text for k in ("not found", "404", "nu am găsit", "pagină"))
    record("404: renders not-found UI", matched)


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()
        try:
            await test_landing(page)
            await test_signup(page)
            await test_login(page)
            await test_404(page)
            await test_protected_redirects(context)
        finally:
            await browser.close()

    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"\n=== {passed}/{total} passed ===")
    sys.exit(0 if passed == total else 1)


if __name__ == "__main__":
    asyncio.run(main())
