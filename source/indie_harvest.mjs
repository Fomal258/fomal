
import { chromium } from "playwright";
import fs from "node:fs";
const ROSTERS = {
  Beyond: "https://www.beyondwrestling.com/roster",
  BLP: "https://www.blacklabelpro.com/roster",
  Prestige: "https://www.prestigewrestling.com/roster",
  Smash: "https://smash-wrestling.com/roster/",
  C4: "https://c4wrestling.com/roster/",
  ICWNHB: "https://www.icwnoholdsbarred.com/roster",
  Revolver: "https://www.wrestlingrevolver.com/roster",
  H2O: "https://www.h2owrestling.com/roster"
};
const missing = JSON.parse(fs.readFileSync("/tmp/missing_final.json", "utf8"));
const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36", viewport: { width: 1400, height: 1200 } });
const entries = [];
for (const [promo, url] of Object.entries(ROSTERS)) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
    await page.waitForTimeout(3000);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });
    const items = await page.evaluate(() => [...document.querySelectorAll("img")].map(i => ({ alt: (i.getAttribute("alt") || "").trim(), src: i.currentSrc || i.src, w: i.naturalWidth })).filter(i => i.alt.length > 2 && i.alt.length < 60 && i.src && !i.src.startsWith("data:")));
    items.forEach(i => entries.push({ promo, ...i, page: url }));
    console.log(promo.padEnd(10), "imgs:", items.length);
  } catch (e) { console.log(promo.padEnd(10), "ERR", String(e).slice(0, 50)); }
  await page.close();
}
const byImg = new Map(); entries.forEach(e => { byImg.set(e.img, (byImg.get(e.img) || 0) + 1); });
const hits = {};
for (const n of missing) {
  const cand = entries.filter(e => norm(e.name) === norm(n) && byImg.get(e.img) === 1);
  if (cand.length) hits[n] = cand.sort((a,b)=>(b.w||0)-(a.w||0))[0];
}
console.log("exact matches:", Object.keys(hits).length);
for (const [n,e] of Object.entries(hits)) console.log("  ", n.padEnd(22), e.promo, (e.img||"").slice(0,55));
fs.writeFileSync("/tmp/promo_hits3.json", JSON.stringify(hits, null, 1));
await browser.close();
