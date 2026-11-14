
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const bad = [];
page.on("response", r => { if (r.status() >= 400) bad.push(r.status() + " " + r.url().split("/").pop()); });
page.on("pageerror", e => bad.push("pageerror " + e.message.slice(0, 60)));

await page.goto("https://fomal258.github.io/fomal/?v=32", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(2500);

const names = ["Wardlow","PCO","Crazzy Steve","Flip Gordon","Tony Nese","Joe Coffey","Davey Boy Smith Jr.","Aigle Blanc"];
let ok = 0;
for (const n of names) {
  await page.fill('input[aria-label="선수 검색"], .search-box input', n);
  await page.waitForTimeout(1400);
  const loaded = await page.evaluate(() => {
    const c = document.querySelector(".card-shell");
    const img = c && c.querySelector(".card-image img");
    return img ? img.naturalWidth > 0 : false;
  });
  if (loaded) ok++;
  console.log(n.padEnd(20), loaded);
}
console.log("photos loaded:", ok + "/" + names.length);
console.log("failed responses:", bad.length, bad.slice(0, 6));
await page.fill('input[aria-label="선수 검색"], .search-box input', "");
await page.waitForTimeout(1400);
await page.screenshot({ path: "photos-final2.png", clip: { x: 0, y: 300, width: 1440, height: 430 } });
await browser.close();
