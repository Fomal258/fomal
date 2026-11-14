
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://fomal258.github.io/fomal/?v=46", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(2200);
console.log("options:", JSON.stringify(await page.evaluate(() => [...document.querySelector("select[aria-label='로스터 정렬']").options].map(o => o.textContent))));
console.log("selected:", await page.evaluate(() => document.querySelector("select[aria-label='로스터 정렬']").selectedOptions[0]?.textContent));
await browser.close();
