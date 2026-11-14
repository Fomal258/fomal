import { chromium, devices } from "playwright";
const base = "https://fomal258.github.io/fomal/?v=12";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(base, { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 40000 });
await page.waitForSelector(".mobile-dock");
await page.waitForTimeout(1500);
const m = await page.evaluate(() => {
  const chips = [...document.querySelectorAll(".alpha-chip")];
  const cap = document.querySelector(".tc-name-text");
  return {
    caption: cap ? getComputedStyle(cap).fontSize : null,
    chipRows: new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size,
    chipH: Math.round(chips[0].getBoundingClientRect().height),
    gridCols: getComputedStyle(document.querySelector(".roster-grid")).gridTemplateColumns.split(" ").length,
    dock: Math.round(document.querySelector(".mobile-dock").getBoundingClientRect().height),
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    firstCard: Math.round(document.querySelector(".card-shell").getBoundingClientRect().top + scrollY)
  };
});
console.log("mobile live:", JSON.stringify(m));
await page.click('.mobile-dock button[data-act="sync"]');
await page.waitForSelector(".gh-quick", { timeout: 10000 });
await page.waitForTimeout(500);
const sheet = await page.evaluate(() => {
  const el = document.querySelector(".gh-sync-modal");
  const r = el.getBoundingClientRect();
  const close = el.querySelector(".editor-header button");
  const cr = close ? close.getBoundingClientRect() : null;
  return { bottomGap: Math.round(innerHeight - r.bottom), radius: getComputedStyle(el).borderTopLeftRadius, close: cr ? [Math.round(cr.width), Math.round(cr.height)] : null };
});
console.log("sheet:", JSON.stringify(sheet));
await page.screenshot({ path: "../mobile-final.png" });
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
