
import { chromium, devices } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const reqs = [];
page.on("request", r => { if (/photos\//.test(r.url())) reqs.push(r.url().split("/").pop()); });
await page.goto("https://fomal258.github.io/fomal/?v=18", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 40000 });
await page.waitForTimeout(2000);
await page.locator(".card-shell").first().hover();
await page.waitForTimeout(500);
const a = await page.evaluate(() => {
  const cs = getComputedStyle(document.querySelector(".card-shell"));
  let inf = 0;
  document.getAnimations().forEach(x => {
    const t = x.effect && x.effect.getTiming ? x.effect.getTiming() : {};
    if (t.iterations === Infinity) inf++;
  });
  return { transform: cs.transform, infinite: inf };
});
console.log("hover transform:", a.transform, "| infinite anims:", a.infinite);
const dup = {}; reqs.forEach(n => dup[n] = (dup[n] || 0) + 1);
console.log("photo reqs:", reqs.length, "| dup:", JSON.stringify(Object.entries(dup).filter(([, c]) => c > 1).slice(0, 4)));
const m = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
await m.goto("https://fomal258.github.io/fomal/?v=18", { waitUntil: "load" });
await m.waitForSelector(".card-shell");
await m.waitForTimeout(1500);
const mob = await m.evaluate(() => {
  const H = s => { const e = document.querySelector(s); const r = e && e.getBoundingClientRect(); return r ? [Math.round(r.width), Math.round(r.height)] : null; };
  return { fav: H(".favorite-button"), edit: H(".card-edit"), caption: getComputedStyle(document.querySelector(".tc-name-text")).fontSize,
           firstCard: Math.round(document.querySelector(".card-shell").getBoundingClientRect().top + scrollY), hero: Math.round(document.querySelector(".hero").getBoundingClientRect().height) };
});
console.log("mobile:", JSON.stringify(mob));
await browser.close();
