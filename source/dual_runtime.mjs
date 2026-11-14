
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message.slice(0, 80)));
await page.goto("http://localhost:8080/index-final.html");
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(2200);

console.log("layer style:", await page.evaluate(() => Boolean(document.getElementById("layers-runtime"))));
console.log("dock:", await page.evaluate(() => !!document.querySelector(".mobile-dock")));
console.log("scrollbar css:", await page.evaluate(() => {
  const el = document.querySelector(".silhouette-poster") || document.body;
  return getComputedStyle(document.documentElement).getPropertyValue("--font-scale").trim() || "n/a";
}));

await page.selectOption('[aria-label="선택"]', "default").catch(() => {});
await page.selectOption('select[aria-label="로스터 정렬"]', "default");
await page.waitForTimeout(800);
const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
const name = await page.evaluate((i) => document.querySelectorAll(".card-shell")[i].querySelector(".tc-name-text").textContent.trim(), idx);
const click = async (sel) => page.evaluate(([n, s]) => {
  const c = [...document.querySelectorAll(".card-shell")].find(x => x.querySelector(".tc-name-text")?.textContent.trim() === n);
  c?.querySelector(s)?.click();
}, [name, sel]);
await click(".prospect-button"); await page.waitForTimeout(400);
await click(".favorite-button"); await page.waitForTimeout(1000);

console.log("dual:", JSON.stringify(await page.evaluate((n) => {
  const c = [...document.querySelectorAll(".card-shell")].find(x => x.querySelector(".tc-name-text")?.textContent.trim() === n);
  const cs = getComputedStyle(c.querySelector(".tc-frame"));
  return { champ: c.classList.contains("is-champ"), prospect: c.classList.contains("is-prospect"),
           split: (cs.backgroundImage.match(/radial-gradient/g) || []).length,
           gold: cs.backgroundImage.includes("240, 198, 96"), blue: cs.backgroundImage.includes("96, 165, 250") };
}, name)));
await page.screenshot({ path: "dual-runtime.png", clip: { x: 20, y: 170, width: 940, height: 560 } });
console.log("errors:", errs.length ? errs : "none");
await browser.close();
