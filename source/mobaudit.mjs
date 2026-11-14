import { chromium, devices } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
await page.goto(base + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1200);

const m = await page.evaluate(() => {
  const box = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; };
  const chips = [...document.querySelectorAll(".alpha-chip")];
  const rows = new Set(chips.map(c => Math.round(c.getBoundingClientRect().top)));
  const tiny = [];
  document.querySelectorAll("body *").forEach(el => {
    if (!el.textContent || el.children.length) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 11) tiny.push((el.className || el.tagName) + ":" + fs + "px");
  });
  const h1 = document.querySelector(".hero h1");
  return {
    headerH: box(".site-header") ? box(".site-header").h : null,
    heroH: box(".hero") ? box(".hero").h : null,
    h1Size: h1 ? getComputedStyle(h1).fontSize : null,
    toolbarH: box(".roster-toolbar") ? box(".roster-toolbar").h : null,
    chipRows: rows.size,
    chipCount: chips.length,
    chipSize: chips[0] ? [Math.round(chips[0].getBoundingClientRect().width), Math.round(chips[0].getBoundingClientRect().height)] : null,
    gridCols: getComputedStyle(document.querySelector(".roster-grid")).gridTemplateColumns.split(" ").length,
    cardH: box(".card-shell") ? box(".card-shell").h : null,
    captionFont: document.querySelector(".tc-name-text") ? getComputedStyle(document.querySelector(".tc-name-text")).fontSize : null,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    tiny: tiny.slice(0, 8),
    dockH: box(".mobile-dock") ? box(".mobile-dock").h : null,
    sectionPadTop: getComputedStyle(document.querySelector(".roster-section")).paddingTop,
    firstCardTop: document.querySelector(".card-shell") ? Math.round(document.querySelector(".card-shell").getBoundingClientRect().top + window.scrollY) : null
  };
});
console.log(JSON.stringify(m, null, 1));
await page.screenshot({ path: "mob-audit.png" });
await browser.close();
