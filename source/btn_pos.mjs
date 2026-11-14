
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:8899/index-final.html");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1800);
console.log(JSON.stringify(await page.evaluate(() => {
  const card = document.querySelector(".card-shell");
  const r = s => { const e = card.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); const c = getComputedStyle(e); return { top: Math.round(b.top), left: Math.round(b.left), w: Math.round(b.width), h: Math.round(b.height), pos: c.position, z: c.zIndex, op: c.opacity }; };
  return { card: (() => { const b = card.getBoundingClientRect(); return { top: Math.round(b.top), h: Math.round(b.height) }; })(),
           favorite: r(".favorite-button"), prospect: r(".prospect-button"), edit: r(".card-edit") };
}), null, 1));
await browser.close();
