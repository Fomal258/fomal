
import { chromium, devices } from "playwright";
const browser = await chromium.launch();
const m = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
await m.goto("file:///home/fomal/index.html?q=");
await m.waitForSelector(".card-shell");
await m.waitForTimeout(1000);
console.log(JSON.stringify(await m.evaluate(() => {
  const hero = document.querySelector(".hero");
  const kids = [...document.querySelector(".hero-content").children].map(e => {
    const r = e.getBoundingClientRect();
    return { cls: (e.className || e.tagName).toString().slice(0, 28), h: Math.round(r.height), txt: (e.textContent || "").trim().slice(0, 20) };
  });
  const cs = getComputedStyle(hero);
  return { heroH: Math.round(hero.getBoundingClientRect().height), minH: cs.minHeight, pad: cs.padding,
           contentPad: getComputedStyle(document.querySelector(".hero-content")).padding, kids };
}), null, 1));
await browser.close();
