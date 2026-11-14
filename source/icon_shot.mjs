
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 780, height: 540 }, deviceScaleFactor: 2 });
await page.goto("file:///home/fomal/icon-options.html");
await page.waitForTimeout(600);
await page.screenshot({ path: "icon-options.png", fullPage: true });
const box = await page.evaluate(() => ({ h: document.body.scrollHeight, w: document.body.scrollWidth }));
console.log(JSON.stringify(box));
await browser.close();
