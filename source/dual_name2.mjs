
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message.slice(0, 80)));
await page.goto("http://localhost:8080/index-final.html");
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(1500);

await page.selectOption('select[aria-label="로스터 정렬"]', "default");
await page.waitForTimeout(900);

const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
const name = await page.evaluate((i) => document.querySelectorAll(".card-shell")[i].querySelector(".tc-name-text").textContent.trim(), idx);
console.log("target:", name, "| was champ:", false);

const clickIn = async (sel) => page.evaluate(([n, s]) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text")?.textContent.trim() === n);
  if (!card) return false;
  const el = card.querySelector(s); if (!el) return false; el.click(); return true;
}, [name, sel]);

await clickIn(".prospect-button");
await page.waitForTimeout(600);
await clickIn(".favorite-button");
await page.waitForTimeout(1200);

console.log("dual:", JSON.stringify(await page.evaluate((n) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text")?.textContent.trim() === n);
  if (!card) return "gone";
  const cs = getComputedStyle(card.querySelector(".tc-frame"));
  return { champ: card.classList.contains("is-champ"), prospect: card.classList.contains("is-prospect"),
           gold: cs.backgroundImage.includes("198, 96") || cs.backgroundImage.includes("226, 140"),
           blue: cs.backgroundImage.includes("165, 250") || cs.backgroundImage.includes("205, 255") };
}, name)));

await page.reload();
await page.waitForSelector(".card-shell");
await page.waitForTimeout(2500);
console.log("persisted after reload:", await page.evaluate((n) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text")?.textContent.trim() === n);
  return card ? { prospect: card.classList.contains("is-prospect"), champ: card.classList.contains("is-champ") } : "gone";
}, name));
console.log("errors:", errs.length ? errs : "none");
await page.screenshot({ path: "dual-final.png", clip: { x: 20, y: 180, width: 940, height: 560 } });
await browser.close();
