
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message.slice(0, 70)));
await page.goto("https://fomal258.github.io/fomal/?v=43", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(2000);
console.log("options:", JSON.stringify(await page.evaluate(() => [...document.querySelector('select[aria-label="로스터 정렬"]').options].map(o => o.value + ":" + o.textContent + (o.hidden ? "*" : "")))));

await page.selectOption('select[aria-label="로스터 정렬"]', "asc");
await page.waitForTimeout(1000);
const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
const card = page.locator(".card-shell").nth(idx);
await card.locator(".prospect-button").click({ force: true });
await page.waitForTimeout(500);
await card.locator(".favorite-button").click({ force: true });
await page.waitForTimeout(1600);
console.log("dual:", JSON.stringify(await page.evaluate((i) => {
  const c = document.querySelectorAll(".card-shell")[i];
  const cs = getComputedStyle(c.querySelector(".tc-frame"));
  return { name: c.querySelector(".tc-name-text").textContent, champ: c.classList.contains("is-champ"),
           prospect: c.classList.contains("is-prospect"),
           gold: cs.backgroundImage.includes("240, 198, 96") || cs.backgroundImage.includes("250, 226, 140"),
           blue: cs.backgroundImage.includes("96, 165, 250") || cs.backgroundImage.includes("160, 205, 255") };
}, idx)));
await page.screenshot({ path: "dual-live.png", clip: { x: 40, y: 240, width: 760, height: 480 } });

await page.selectOption('select[aria-label="로스터 정렬"]', "prospects");
await page.waitForTimeout(1400);
console.log("filter:", JSON.stringify(await page.evaluate(() => ({
  visible: [...document.querySelectorAll(".card-shell")].filter(c => c.getBoundingClientRect().height > 0).length,
  count: document.querySelector(".count")?.textContent
}))));
await page.screenshot({ path: "filter-live.png", clip: { x: 0, y: 180, width: 1440, height: 620 } });
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
