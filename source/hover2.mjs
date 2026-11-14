import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("file:///home/fomal/index.html");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1000);

const btn = page.locator(".header-edit").nth(3);
await btn.hover();
await page.waitForTimeout(500);

const reds = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("body *").forEach(el => {
    const cs = getComputedStyle(el);
    const bg = cs.backgroundColor || "";
    const bgi = cs.backgroundImage || "";
    const isRed = /rgb\(2(0[0-9]|1[0-9]|2[0-9]), ?\d+, ?\d+\)/.test(bg) && !/rgba\(0, 0, 0/.test(bg);
    const redGrad = /214, 26, 48|201, 22, 43|255, 77, 97/.test(bgi);
    if (!isRed && !redGrad) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    out.push({
      cls: (el.className || el.tagName).toString().slice(0, 40),
      rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
      bg: bg, grad: bgi.slice(0, 50), z: cs.zIndex, pos: cs.position
    });
  });
  return out;
});
console.log(JSON.stringify(reds, null, 1));
await page.screenshot({ path: "hover-check2.png", clip: { x: 840, y: 0, width: 600, height: 80 } });
await browser.close();
