import { chromium, devices } from "playwright";
const file = "file:///home/fomal/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(file + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1200);
const m = await page.evaluate(() => {
  const B = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  const chips = [...document.querySelectorAll(".alpha-chip")];
  return {
    headerH: Math.round(B(".site-header").height),
    heroH: Math.round(B(".hero").height),
    toolbarH: Math.round(B(".roster-toolbar").height),
    chipRows: new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size,
    chipH: Math.round(chips[0].getBoundingClientRect().height),
    caption: getComputedStyle(document.querySelector(".tc-name-text")).fontSize,
    firstCard: Math.round(B(".card-shell").top + scrollY),
    dockH: Math.round(B(".mobile-dock").height),
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    headerActionsScroll: (() => { const e = document.querySelector(".header-inner > div:last-child"); return e ? e.scrollWidth > e.clientWidth : null; })()
  };
});
console.log(JSON.stringify(m));
await page.screenshot({ path: "live-mob-after.png" });
console.log("errors:", errs.length ? errs.slice(0,3) : "none");
await browser.close();
