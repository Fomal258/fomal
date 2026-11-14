
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto("file:///home/fomal/index.html?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1200);

const names = ["Aigle Blanc", "Alex Shelley", "Andrew Everett"];
for (const n of names) {
  await page.fill('input[aria-label="선수 검색"], .search-box input', n);
  await page.waitForTimeout(1100);
  const r = await page.evaluate(() => {
    const card = document.querySelector(".card-shell");
    if (!card) return { found: false };
    const img = card.querySelector(".card-image img");
    return { name: card.querySelector(".tc-name-text")?.textContent, img: img ? img.getAttribute("src") : null, loaded: img ? img.naturalWidth > 0 : false };
  });
  console.log(n, JSON.stringify(r));
}
console.log("errors:", errs.length ? errs.slice(0, 2) : "none");
await browser.close();
