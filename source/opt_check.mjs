import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message.slice(0, 70)));
await page.goto("file:///home/fomal/index.html?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1800);
console.log("options:", JSON.stringify(await page.evaluate(() => {
  const sel = document.querySelector('select[aria-label="로스터 정렬"]');
  return [...sel.options].map(o => o.value + ":" + o.textContent);
})));
console.log("selected label:", await page.evaluate(() => document.querySelector('select[aria-label="로스터 정렬"]').selectedOptions[0]?.textContent));

// 전체 → 유망주 → 전체 왕복
await page.selectOption('select[aria-label="로스터 정렬"]', "prospects");
await page.waitForTimeout(1000);
const f1 = await page.evaluate(() => ({ cls: document.querySelector(".roster-grid").className.includes("prospect-filter"), count: document.querySelector(".count").textContent }));
await page.selectOption('select[aria-label="로스터 정렬"]', "default");
await page.waitForTimeout(1000);
const f2 = await page.evaluate(() => ({ cls: document.querySelector(".roster-grid").className.includes("prospect-filter"), count: document.querySelector(".count").textContent, label: document.querySelector('select[aria-label="로스터 정렬"]').selectedOptions[0]?.textContent }));
console.log("prospects:", JSON.stringify(f1), "| back to 전체:", JSON.stringify(f2));
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
