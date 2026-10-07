
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
import json
import os

SCREENSHOTS = Path("/tmp/browser/audit_diag/screenshots")
SCREENSHOTS.mkdir(parents=True, exist_ok=True)

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await context.new_page()

        print("Navigating to http://localhost:8080")
        await page.goto("http://localhost:8080", wait_until="networkidle")
        await page.screenshot(path=str(SCREENSHOTS / "1_home.png"))

        # Try to find a way to start a diagnosis or trigger the function
        # Based on context summary, there's a "GERAR DIAGNÓSTICO" button
        
        # 1. Sign up a test user if none exist (or just go to the diagnosis flow if public)
        # Assuming we can navigate directly to a diagnosis route if it exists
        # Let's check common routes or just try to click the button on home
        
        try:
            # Look for diagnosis button
            btn = page.get_by_role("button", name="Começar Diagnóstico", exact=False)
            if await btn.count() == 0:
                btn = page.get_by_text("GERAR DIAGNÓSTICO", exact=False)
            
            if await btn.count() > 0:
                print("Clicking diagnosis button")
                await btn.first.click()
                await page.wait_for_load_state("networkidle")
                await page.screenshot(path=str(SCREENSHOTS / "2_diagnosis_started.png"))
            else:
                print("Button not found, trying direct navigation if /diagnosis exists")
                await page.goto("http://localhost:8080/diagnosis", wait_until="networkidle")
                await page.screenshot(path=str(SCREENSHOTS / "2_diagnosis_direct.png"))

            # Fill form (this is generic, I'll need to look for inputs)
            # Diagnosis usually involves multiple steps.
            print("Current URL:", page.url)

        except Exception as e:
            print(f"Error during interaction: {e}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
