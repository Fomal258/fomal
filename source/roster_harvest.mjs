
import { chromium } from "playwright";
import fs from "node:fs";

const ROSTERS = {
  WWE: "https://www.wwe.com/superstars",
  AEW: "https://www.allelitewrestling.com/roster",
  TNA: "https://tnawrestling.com/roster/",
  ROH: "https://www.ringofhonor.com/roster",
  MLW: "https://mlw.com/roster/",
  GCW: "https://gamechangerwrestling.com/roster/",
  PROGRESS: "https://progresswrestling.com/roster/",
  OTT: "https://ottwrestling.com/roster/",
  RevPro: "https://revolutionprowrestling.com/roster/",
  DEFY: "https://www.defywrestling.com/roster",
  NJPW: "https://www.njpw1972.com/profile/",
  NOAH: "https://www.noah.co.jp/wrestler/",
  DDT: "https://www.ddtpro.com/wrestlers"
};

const missing = JSON.parse(fs.readFileSync("/tmp/missing_final.json", "utf8"));
const norm = s => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  viewport: { width: 1440, height: 1200 }
});

const entries = [];
for (const [promo, url] of Object.entries(ROSTERS)) {
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3500);
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1200);
    const items = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("img").forEach(img => {
        const alt = (img.getAttribute("alt") || "").trim();
        const src = img.currentSrc || img.src;
        if (!src || src.startsWith("data:")) return;
        if (!alt || alt.length < 3 || alt.length > 60) return;
        const r = img.getBoundingClientRect();
        if (r.width < 40 && img.naturalWidth < 200) return;
        out.push({ alt, src, w: img.naturalWidth });
      });
      return out;
    });
    items.forEach(i => entries.push({ promo, name: i.alt, img: i.src, w: i.w, page: url }));
    console.log(promo.padEnd(10), "imgs:", items.length);
  } catch (e) {
    console.log(promo.padEnd(10), "ERR", String(e).slice(0, 60));
  }
  await page.close();
}

// 정확 일치만 + 중복 이미지 제거
const byImg = new Map();
entries.forEach(e => { if (!byImg.has(e.img)) byImg.set(e.img, []); byImg.get(e.img).push(e); });
const hits = {};
for (const n of missing) {
  const key = norm(n);
  const cand = entries.filter(e => norm(e.name) === key && byImg.get(e.img).length === 1);
  if (cand.length) hits[n] = cand.sort((a, b) => (b.w || 0) - (a.w || 0))[0];
}
console.log("exact matches:", Object.keys(hits).length);
for (const [n, e] of Object.entries(hits)) console.log("  ", n.padEnd(24), e.promo, (e.img || "").slice(0, 60));

fs.writeFileSync("/tmp/promo_hits2.json", JSON.stringify(hits, null, 1));
await browser.close();
