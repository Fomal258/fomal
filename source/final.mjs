import { chromium } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(base + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1000);
const r = await page.evaluate(() => {
  const before = getComputedStyle(document.querySelector(".roster-section"), "::before");
  const g = (s) => { const el = document.querySelector(s); return el ? getComputedStyle(el).color : "none"; };
  return {
    beforeHeight: before.height, beforeBg: before.backgroundImage.slice(0, 40),
    chip: g(".alpha-chip"), footer: g(".under-grid p"), note: g(".roster-note span")
  };
});
console.log(JSON.stringify(r));
await page.screenshot({ path: "final-desktop.png" });
console.log("errors:", errs.length ? errs : "none");
await browser.close();
