
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://fomal258.github.io/fomal/?v=23", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(1500);
await page.fill('input[aria-label="선수 검색"], .search-box input', "Alex Shelley");
await page.waitForTimeout(1400);
await page.screenshot({ path: "photo-added.png", clip: { x: 0, y: 300, width: 1440, height: 420 } });
const vis = await page.evaluate(() => {
  const card = document.querySelector(".card-shell");
  const poster = card.querySelector(".silhouette-poster");
  const img = card.querySelector(".card-image img");
  return {
    imgSrc: img && img.getAttribute("src"),
    imgLoaded: img ? img.naturalWidth > 0 : false,
    posterDisplay: poster ? getComputedStyle(poster).display : null
  };
});
console.log(JSON.stringify(vis));
await browser.close();
