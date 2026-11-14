
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message.slice(0, 80)));
await page.goto("http://localhost:8080/index-final.html");
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(1800);

const name = await page.evaluate(() => document.querySelector(".card-shell .tc-name-text").textContent.trim());
console.log("target:", name);

const locate = () => page.evaluate((n) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text")?.textContent.trim() === n);
  if (!card) return null;
  const r = card.getBoundingClientRect();
  const fav = card.querySelector(".favorite-button")?.getBoundingClientRect();
  const pro = card.querySelector(".prospect-button")?.getBoundingClientRect();
  return { top: Math.round(r.top), fav: fav && [Math.round(fav.top), Math.round(fav.bottom)], pro: pro && [Math.round(pro.top), Math.round(pro.bottom)] };
}, name);
console.log("before:", JSON.stringify(await locate()));

await page.evaluate((n) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text")?.textContent.trim() === n);
  card.querySelector(".prospect-button").click();
}, name);
await page.waitForTimeout(600);

await page.evaluate((n) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text")?.textContent.trim() === n);
  card.querySelector(".favorite-button").click();
}, name);
await page.waitForTimeout(1200);

console.log("after:", JSON.stringify(await page.evaluate((n) => {
  const card = [...document.querySelectorAll(".card-shell")].find(c => c.querySelector(".tc-name-text")?.textContent.trim() === n);
  if (!card) return "card gone";
  const cs = getComputedStyle(card.querySelector(".tc-frame"));
  return { champ: card.classList.contains("is-champ"), prospect: card.classList.contains("is-prospect"),
           gold: cs.backgroundImage.includes("240, 198, 96") || cs.backgroundImage.includes("250, 226, 140"),
           blue: cs.backgroundImage.includes("96, 165, 250") || cs.backgroundImage.includes("160, 205, 255") };
}, name)));
console.log("errors:", errs.length ? errs : "none");
await page.screenshot({ path: "dual-final.png", clip: { x: 20, y: 200, width: 900, height: 520 } });
await browser.close();
