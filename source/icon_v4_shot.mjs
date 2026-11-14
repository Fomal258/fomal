
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 800, height: 560 }, deviceScaleFactor: 2 });
await page.goto("file:///home/fomal/icon-v4.html");
await page.waitForTimeout(400);
await page.screenshot({ path: "icon-v4.png", fullPage: true });
await browser.close();
