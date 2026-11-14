import { chromium, devices } from "playwright";
const file = "file:///home/fomal/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(file + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(800);

// 정보 팝업
await page.locator(".card-caption").first().click();
await page.waitForSelector(".info-modal", { timeout: 8000 });
await page.waitForTimeout(600);
const info = await page.evaluate(() => {
  const el = document.querySelector(".info-modal");
  const r = el.getBoundingClientRect();
  const close = el.querySelector("header button");
  const cr = close ? close.getBoundingClientRect() : null;
  return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), closeSize: cr ? [Math.round(cr.width), Math.round(cr.height)] : null,
           closeVisible: cr ? (cr.top >= 0 && cr.bottom <= innerHeight) : null,
           scrollable: el.scrollHeight > el.clientHeight };
});
console.log("info modal:", JSON.stringify(info));
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

// 동기화 모달 (하단 시트)
await page.click('.mobile-dock button[data-act="sync"]');
await page.waitForSelector(".gh-quick", { timeout: 8000 });
await page.waitForTimeout(600);
const sheet = await page.evaluate(() => {
  const el = document.querySelector(".gh-sync-modal");
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(innerHeight - r.bottom), radius: getComputedStyle(el).borderTopLeftRadius };
});
console.log("sync sheet:", JSON.stringify(sheet));
await page.screenshot({ path: "mobile-sheet.png" });

const taps = await page.evaluate(() => [...document.querySelectorAll(".mobile-dock button")].map(b => Math.round(b.getBoundingClientRect().height)));
console.log("dock tap heights:", taps.join(","));
console.log("errors:", errs.length ? errs.slice(0,3) : "none");
await browser.close();
