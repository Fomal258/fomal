import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("file://" + process.cwd() + "/dist/index.html");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(900);
const rows = await page.evaluate(() => {
  const seen = new Map();
  document.querySelectorAll("body *").forEach(el => {
    if (!el.textContent || el.children.length || !el.getBoundingClientRect().width) return;
    const fs = Math.round(parseFloat(getComputedStyle(el).fontSize));
    if (!seen.has(fs)) seen.set(fs, (el.className || el.tagName) + " :: " + el.textContent.trim().slice(0, 24));
  });
  return [...seen.entries()].sort((a,b)=>b[0]-a[0]);
});
rows.forEach(([s, who]) => console.log(s + "px  " + who));
await browser.close();
