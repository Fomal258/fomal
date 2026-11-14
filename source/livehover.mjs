import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("https://fomal258.github.io/fomal/?v=14", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 40000 });
await page.waitForTimeout(1500);
const pill = await page.evaluate(() => {
  const p = document.querySelector(".ctrl-hover-bg");
  return p ? getComputedStyle(p).display : "absent";
});
const n = await page.locator(".header-edit").count();
const out = [];
for (let i = 0; i < n; i++) {
  await page.locator(".header-edit").nth(i).hover();
  await page.waitForTimeout(200);
  out.push(await page.evaluate((idx) => {
    const b = document.querySelectorAll(".header-edit")[idx];
    let movingRed = 0;
    document.querySelectorAll(".site-header *").forEach(el => {
      const s = getComputedStyle(el);
      if (s.position === "absolute" && s.display !== "none" && s.opacity !== "0" &&
          /rgba?\(2(0[0-9]|1[0-9]|2[0-9]), ?\d+, ?\d+/.test(s.backgroundColor)) movingRed++;
    });
    return { bg: getComputedStyle(b).backgroundColor, movingRed };
  }, i));
}
console.log("pill:", pill, "| buttons:", n);
out.forEach((r, i) => console.log(" btn" + i, r.bg, "movingRed=" + r.movingRed));
await page.locator(".header-edit").nth(3).hover();
await page.waitForTimeout(300);
await page.screenshot({ path: "../hover-live-fixed.png", clip: { x: 800, y: 0, width: 640, height: 80 } });
await browser.close();
