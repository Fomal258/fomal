
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 780 }, deviceScaleFactor: 2 });
await page.goto("file:///home/fomal/prospect-variants.html");
await page.waitForTimeout(2500);
await page.screenshot({ path: "prospect-variants.png", fullPage: true });
await browser.close();
