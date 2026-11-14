import { chromium, devices } from "playwright";
const file = "file://" + process.cwd() + "/dist/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(file);
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(1000);
const d = await page.evaluate(() => {
  const sizes = new Set();
  document.querySelectorAll("body *").forEach(el => {
    if (!el.textContent || el.children.length) return;
    if (!el.getBoundingClientRect().width) return;
    sizes.add(Math.round(parseFloat(getComputedStyle(el).fontSize)));
  });
  let shadows = 0;
  document.querySelectorAll("body *").forEach(el => { if (getComputedStyle(el).textShadow !== "none") shadows++; });
  return { sizes: [...sizes].sort((a,b)=>a-b), shadows, countBg: getComputedStyle(document.querySelector(".count") || document.body).backgroundColor };
});
console.log("desktop sizes:", d.sizes.length, d.sizes.join(","), "| text-shadow els:", d.shadows);

const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const m = await ctx.newPage();
await m.goto(file);
await m.waitForSelector(".card-shell");
await m.waitForTimeout(900);
const mm = await m.evaluate(() => {
  const g = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  return {
    hero: Math.round(g(".hero")?.height || 0),
    toolbar: Math.round(g(".roster-toolbar")?.height || 0),
    caption: getComputedStyle(document.querySelector(".tc-name-text")).fontSize,
    firstCard: Math.round((g(".card-shell")?.top || 0) + window.scrollY),
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    chipRows: new Set([...document.querySelectorAll(".alpha-chip")].map(c => Math.round(c.getBoundingClientRect().top))).size
  };
});
console.log("mobile:", JSON.stringify(mm));
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await m.screenshot({ path: "dist-mobile.png" });
await browser.close();
