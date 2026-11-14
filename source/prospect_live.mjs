
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 70)); });
page.on("pageerror", e => errs.push("pageerror " + e.message.slice(0, 70)));
await page.goto("https://fomal258.github.io/fomal/?v=40", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(2000);

console.log("buttons:", await page.evaluate(() => document.querySelectorAll(".prospect-button").length));

// 찜 아닌 카드 하나를 골라 켜기
await page.selectOption('select[aria-label="로스터 정렬"]', "asc");
await page.waitForTimeout(1200);
const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
const name = await page.evaluate((i) => document.querySelectorAll(".card-shell")[i].querySelector(".tc-name-text").textContent, idx);
await page.locator(".card-shell").nth(idx).locator(".prospect-button").click({ force: true });
await page.waitForTimeout(600);
console.log("on:", await page.evaluate((i) => {
  const c = document.querySelectorAll(".card-shell")[i];
  return { name: c.querySelector(".tc-name-text").textContent, prospect: c.classList.contains("is-prospect") };
}, idx));

// 새로고침 후 유지 확인
await page.reload({ waitUntil: "load" });
await page.waitForSelector(".card-shell");
await page.waitForTimeout(2500);
const persisted = await page.evaluate((n) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text").textContent.trim() === n);
  return card ? card.classList.contains("is-prospect") : "card-not-visible";
}, name);
console.log("persisted after reload:", persisted, "| target:", name);
console.log("console errors:", errs.length, errs.slice(0, 3));
await page.screenshot({ path: "prospect-live.png", clip: { x: 40, y: 240, width: 900, height: 520 } });
await browser.close();
