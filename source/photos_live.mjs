
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://fomal258.github.io/fomal/?v=26", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(1200);
const names = ["Wardlow","PCO","Crazzy Steve","Flip Gordon","Tony Nese","Joe Coffey","Bad Dude Tito","Davey Boy Smith Jr."];
for (const n of names) {
  await page.fill('input[aria-label="선수 검색"], .search-box input', n);
  await page.waitForTimeout(900);
  const r = await page.evaluate(() => {
    const c = document.querySelector(".card-shell");
    if (!c) return { found:false };
    const img = c.querySelector(".card-image img");
    return { found:true, name: c.querySelector(".tc-name-text")?.textContent, src: img?img.getAttribute("src"):null, loaded: img?img.naturalWidth>0:false };
  });
  console.log(n.padEnd(20), JSON.stringify(r).slice(0, 130));
}
await page.screenshot({ path: "photos-live.png", clip: { x: 0, y: 260, width: 1440, height: 460 } });
await browser.close();
