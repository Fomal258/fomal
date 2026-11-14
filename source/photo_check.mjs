
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://fomal258.github.io/fomal/?v=22", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(1500);

const names = ["Aigle Blanc", "Alex Reynolds", "Alex Shelley", "Andrew Everett"];
const out = [];
for (const n of names) {
  await page.fill('input[aria-label="선수 검색"], .search-box input', n);
  await page.waitForTimeout(900);
  const info = await page.evaluate(() => {
    const card = document.querySelector(".card-shell");
    if (!card) return { found: false };
    const img = card.querySelector("img");
    return {
      found: true,
      name: card.querySelector(".tc-name-text")?.textContent,
      src: img ? img.getAttribute("src") : null,
      loaded: img ? img.naturalWidth > 0 : false,
      poster: Boolean(card.querySelector(".silhouette-poster"))
    };
  });
  out.push([n, info]);
}
out.forEach(([n, i]) => console.log(n, "|", JSON.stringify(i)));
await browser.close();
