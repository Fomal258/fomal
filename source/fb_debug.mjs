
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const logs = [];
page.on("console", m => logs.push(m.type() + ": " + m.text().slice(0, 90)));
page.on("pageerror", e => logs.push("pageerror: " + e.message.slice(0, 90)));
await page.goto("https://fomal258.github.io/fomal/?v=27", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(1500);
await page.fill('input[aria-label="선수 검색"], .search-box input', "Wardlow");
await page.waitForTimeout(2500);
const d = await page.evaluate(() => {
  const c = document.querySelector(".card-shell");
  return {
    hasFallback: Boolean(window.__photoFallback),
    cardHTML: c ? c.querySelector(".card-image")?.outerHTML.slice(0, 260) : null,
    poster: Boolean(c && c.querySelector(".silhouette-poster")),
    filledFlag: c ? c.querySelector(".card-image")?.dataset.photoFilled : null,
    imgs: c ? [...c.querySelectorAll("img")].map(i => i.getAttribute("src")) : []
  };
});
console.log(JSON.stringify(d, null, 1));
console.log("logs:", logs.slice(0, 5));
await browser.close();
