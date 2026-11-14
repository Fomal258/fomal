
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 820, height: 620 }, deviceScaleFactor: 2 });
await page.goto("file:///home/fomal/icon-custom.html");
await page.waitForTimeout(500);
await page.screenshot({ path: "icon-custom.png", fullPage: true });
console.log(JSON.stringify(await page.evaluate(() => ({ h: document.body.scrollHeight, w: document.body.scrollWidth }))));
await browser.close();
