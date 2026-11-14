import { chromium, devices } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
await page.goto(base);
await page.waitForSelector(".alpha-chip");
await page.waitForTimeout(800);
const info = await page.evaluate(() => {
  const chip = document.querySelector(".alpha-chip");
  const cs = getComputedStyle(chip);
  let zoomChain = [];
  let el = chip;
  while (el && el !== document.documentElement) {
    const s = getComputedStyle(el);
    if (s.zoom !== "1" && s.zoom !== "normal") zoomChain.push(el.className + ":" + s.zoom);
    if (s.transform !== "none") zoomChain.push(el.className + ":transform");
    el = el.parentElement;
  }
  return { height: cs.height, minHeight: cs.minHeight, box: cs.boxSizing, transform: cs.transform, zoomChain, vw: innerWidth };
});
console.log(JSON.stringify(info));
await browser.close();
