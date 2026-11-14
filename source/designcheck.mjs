import { chromium, devices } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push("page: " + e.message));
page.on("console", m => { if (m.type() === "error" && !m.text().includes("ERR_FILE_NOT_FOUND") && !m.text().includes("roster-data.json")) errs.push("console: " + m.text().slice(0, 100)); });
await page.goto(base + "?q=");
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(1500);

const stats = await page.evaluate(() => {
  const sizes = new Set(), colors = new Set(), emojis = new Set();
  const RE = /[\u{1F300}-\u{1FAFF}\u2705\u274C]/u;
  document.querySelectorAll("body *").forEach(el => {
    if (!el.textContent || el.children.length) return;
    const cs = getComputedStyle(el);
    if (el.getBoundingClientRect().width === 0) return;
    sizes.add(Math.round(parseFloat(cs.fontSize)));
    colors.add(cs.color);
    const m = (el.firstChild && el.firstChild.nodeType === 3 ? el.textContent : "").match(RE);
    if (m) emojis.add(m[0]);
  });
  const count = document.querySelector(".count");
  const add = document.querySelector(".add-card");
  return {
    sizes: [...sizes].sort((a,b)=>a-b),
    colorCount: colors.size,
    emojis: [...emojis],
    countBg: count ? getComputedStyle(count).backgroundColor : null,
    addBg: add ? getComputedStyle(add).backgroundColor : null,
    shadows: [...document.querySelectorAll("h1,h2,.tc-name-text")].map(el => getComputedStyle(el).textShadow).filter(t => t !== "none").length
  };
});
console.log("visible font sizes:", stats.sizes.length, stats.sizes.join(","));
console.log("distinct text colors:", stats.colorCount);
console.log("emoji in UI:", stats.emojis.length ? stats.emojis.join(" ") : "none");
console.log("count chip bg:", stats.countBg, "| add-card bg:", stats.addBg);
console.log("elements with text-shadow:", stats.shadows);
await page.screenshot({ path: "../design-after-desktop.png" });

const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(base + "?q=");
await m.waitForSelector(".card-shell");
await m.waitForTimeout(1200);
await m.screenshot({ path: "../design-after-mobile.png" });
console.log("errors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
