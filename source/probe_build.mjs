
import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message.slice(0, 90)));
page.on("console", m => { if (m.type() === "error" && !/roster-data|404/.test(m.text())) errs.push(m.text().slice(0, 80)); });

await page.goto("http://localhost:8899/index.html");
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(2000);

console.log("cards:", await page.evaluate(() => document.querySelectorAll(".card-shell").length));
console.log("prospect buttons:", await page.evaluate(() => document.querySelectorAll(".prospect-button").length));
console.log("options:", JSON.stringify(await page.evaluate(() => [...document.querySelector("select[aria-label='로스터 정렬']").options].map(o => o.textContent))));
console.log("header buttons:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll(".header-edit")].map(b => b.innerText.trim()))));

// 유망주 토글
const card = page.locator(".card-shell").first();
await card.locator(".prospect-button").click({ force: true });
await page.waitForTimeout(700);
console.log("after toggle:", await page.evaluate(() => {
  const c = document.querySelector(".card-shell");
  return { prospect: c.classList.contains("is-prospect"), pressed: c.querySelector(".prospect-button")?.getAttribute("aria-pressed") };
}));

// 새로고침 후 유지 (IndexedDB)
await page.reload();
await page.waitForSelector(".card-shell");
await page.waitForTimeout(2500);
console.log("persisted:", await page.evaluate(() => document.querySelector(".card-shell").classList.contains("is-prospect")));

// 유망주 필터
await page.selectOption('select[aria-label="로스터 정렬"]', "prospects");
await page.waitForTimeout(900);
console.log("filter prospects:", await page.evaluate(() => document.querySelectorAll(".card-shell").length));

// 동기화 모달
await page.click('.header-edit.header-gh');
await page.waitForSelector(".gh-sync-modal", { timeout: 5000 });
console.log("modal fields:", await page.evaluate(() => document.querySelectorAll(".gh-sync-modal input").length));
await page.keyboard.press("Escape");
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await page.screenshot({ path: "src-build.png" });
await browser.close();
