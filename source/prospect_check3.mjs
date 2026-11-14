
import { chromium, devices } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("file:///home/fomal/index.html?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1000);

await page.selectOption('select[aria-label="로스터 정렬"]', "asc");
await page.waitForTimeout(1200);

const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
console.log("non-champ index:", idx);
if (idx >= 0) {
  await page.locator(".card-shell").nth(idx).locator(".prospect-button").click({ force: true });
  await page.waitForTimeout(500);
  const cobalt = await page.evaluate((i) => {
    const card = document.querySelectorAll(".card-shell")[i];
    const cs = getComputedStyle(card.querySelector(".tc-frame"));
    const nm = getComputedStyle(card.querySelector(".tc-name-text"));
    return { classes: card.className, bg: cs.backgroundImage.slice(0, 64), glow: cs.boxShadow.slice(0, 52), fill: nm.webkitTextFillColor };
  }, idx);
  console.log("cobalt-only:", JSON.stringify(cobalt, null, 1));
  await page.screenshot({ path: "prospect-cobalt.png", clip: { x: 40, y: 240, width: 900, height: 520 } });
}

const ctx = await browser.newContext({ ...devices["iPhone 13"], hasTouch: true, isMobile: true });
const m = await ctx.newPage();
await m.goto("file:///home/fomal/index.html?q=");
await m.waitForSelector(".card-shell");
await m.waitForTimeout(1200);
console.log("mobile button:", JSON.stringify(await m.evaluate(() => {
  const b = document.querySelector(".prospect-button");
  const cs = getComputedStyle(b); const r = b.getBoundingClientRect();
  return { opacity: cs.opacity, size: [Math.round(r.width), Math.round(r.height)] };
})));
await m.screenshot({ path: "prospect-mobile.png", clip: { x: 0, y: 150, width: 390, height: 430 } });
await browser.close();
