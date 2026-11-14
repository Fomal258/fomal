
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message.slice(0, 90)));
await page.goto("http://localhost:8899/index-final.html");
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(2000);
console.log("cards:", await page.evaluate(() => document.querySelectorAll(".card-shell").length));
console.log("dock:", await page.evaluate(() => Boolean(document.querySelector(".mobile-dock"))));
console.log("options:", JSON.stringify(await page.evaluate(() => [...document.querySelector("select[aria-label='로스터 정렬']").options].map(o => o.textContent))));
console.log("header:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll(".header-edit")].map(b => b.innerText.trim()))));
// 유망주 토글 + 찜 동시
const card = page.locator(".card-shell").first();
await card.locator(".prospect-button").click({ force: true });
await page.waitForTimeout(500);
await card.locator(".favorite-button").click({ force: true });
await page.waitForTimeout(900);
console.log("dual:", await page.evaluate(() => {
  const c = document.querySelector(".card-shell");
  const cs = getComputedStyle(c.querySelector(".tc-frame"));
  return { champ: c.classList.contains("is-champ"), prospect: c.classList.contains("is-prospect"),
           gold: cs.backgroundImage.includes("240, 198, 96") || cs.backgroundImage.includes("250, 226, 140"),
           blue: cs.backgroundImage.includes("96, 165, 250") || cs.backgroundImage.includes("160, 205, 255") };
}));
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await page.screenshot({ path: "final-build.png" });
await browser.close();
