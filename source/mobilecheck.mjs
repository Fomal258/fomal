import { chromium, devices } from "playwright";
const base = "https://fomal258.github.io/fomal/";
const browser = await chromium.launch();

// 신규 기기(휴대폰) 시뮬레이션
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(base + "?v=2", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 40000 });
await page.waitForTimeout(2500);
console.log("mobile cards:", await page.locator(".card-shell").count());
const opts = await page.locator('select[aria-label="로스터 정렬"] option').allInnerTexts();
console.log("sort options:", opts.join(" / "));
await page.selectOption('select[aria-label="로스터 정렬"]', "favorites");
await page.waitForTimeout(1200);
console.log("favorites cards:", await page.locator(".card-shell").count());
console.log("favorite names:", (await page.locator(".tc-name-text").allInnerTexts()).slice(0, 6).join(", "));
await page.screenshot({ path: "../mobile-live.png", fullPage: false });
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
