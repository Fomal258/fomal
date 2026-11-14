
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 40)); });
await page.goto("https://fomal258.github.io/fomal/?v=30", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(1200);
const names = ["Wardlow","PCO","Crazzy Steve","Flip Gordon","Tony Nese","Joe Coffey","Davey Boy Smith Jr.","Bad Dude Tito","Aigle Blanc","Alex Shelley"];
let ok = 0;
for (const n of names) {
  await page.fill('input[aria-label="선수 검색"], .search-box input', n);
  await page.waitForTimeout(1600);
  const r = await page.evaluate(() => {
    const c = document.querySelector(".card-shell");
    const img = c && c.querySelector(".card-image img");
    return { name: c?.querySelector(".tc-name-text")?.textContent, loaded: img ? img.naturalWidth > 0 : false, poster: Boolean(c?.querySelector(".silhouette-poster")) };
  });
  if (r.loaded) ok++;
  console.log(n.padEnd(20), JSON.stringify(r));
}
console.log("loaded:", ok + "/" + names.length, "| console errors:", errs.length);
await page.fill('input[aria-label="선수 검색"], .search-box input', "");
await page.waitForTimeout(1200);
await page.screenshot({ path: "photos-final.png", clip: { x: 0, y: 300, width: 1440, height: 430 } });
await browser.close();
