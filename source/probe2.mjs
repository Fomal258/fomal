import { chromium } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(900);
const out = await page.evaluate(() => {
  const res = {};
  const els = [".overline span", ".section-heading h2", ".tab-active", ".toolbar-left:after"];
  // ::before/after 채집
  const pairs = [[".roster-section","::before"], [".section-heading", "::before"], [".section-heading", "::after"], [".roster-toolbar", "::before"], [".toolbar-left", "::after"], [".tab-active", "::after"]];
  res.rects = pairs.map(([sel, pseudo]) => {
    const el = document.querySelector(sel);
    if (!el) return sel + pseudo + " | none";
    const cs = getComputedStyle(el, pseudo);
    return sel + pseudo + " | bg:" + cs.backgroundImage.slice(0, 60) + " | h:" + cs.height + " | bgc:" + cs.backgroundColor;
  });
  const add = document.querySelector(".add-card");
  res.add = add ? {
    text: add.innerText.replace(/\n/g, " / "),
    strong: (() => { const e = add.querySelector("strong"); return e ? getComputedStyle(e).color : "none"; })(),
    small: (() => { const e = add.querySelector("small"); return e ? getComputedStyle(e).color : "none"; })(),
    root: getComputedStyle(add).color,
    bg: getComputedStyle(add).backgroundColor
  } : null;
  res.cards = document.querySelectorAll(".card-shell").length;
  return res;
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
