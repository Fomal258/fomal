import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("file:///home/fomal/index.html");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1200);

const info = await page.evaluate(() => {
  const ctrl = document.querySelector(".header-controls");
  const pills = ctrl ? [...ctrl.querySelectorAll(".nav-hover-bg, .nav-hover-bar, .nav-hover-glow")] : [];
  return {
    hasCtrl: Boolean(ctrl),
    pillCount: pills.length,
    pillParents: pills.map(p => p.className + " | parent:" + (p.parentElement?.className || "")),
    buttons: [...document.querySelectorAll(".header-edit")].map(b => {
      const r = b.getBoundingClientRect();
      return { text: b.innerText.trim().slice(0, 12), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
    })
  };
});
console.log(JSON.stringify(info, null, 1));

// 4번째 버튼 호버 후 pill 위치 측정
const btns = page.locator(".header-edit");
const n = await btns.count();
for (let i = 0; i < Math.min(n, 5); i++) {
  await btns.nth(i).hover();
  await page.waitForTimeout(350);
  const r = await page.evaluate((idx) => {
    const b = document.querySelectorAll(".header-edit")[idx].getBoundingClientRect();
    const pill = document.querySelector(".header-controls .nav-hover-bg");
    if (!pill) return { pill: null };
    const p = pill.getBoundingClientRect();
    return {
      btn: [Math.round(b.left), Math.round(b.width), Math.round(b.height)],
      pill: [Math.round(p.left), Math.round(p.width), Math.round(p.height)],
      opacity: getComputedStyle(pill).opacity
    };
  }, i);
  console.log("hover", i, JSON.stringify(r));
}
await page.screenshot({ path: "hover-check.png", clip: { x: 700, y: 0, width: 740, height: 120 } });
await browser.close();
