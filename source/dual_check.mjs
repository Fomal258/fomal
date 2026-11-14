import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("https://fomal258.github.io/fomal/?v=41", { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(2000);
await page.selectOption('select[aria-label="로스터 정렬"]', "asc");
await page.waitForTimeout(1200);
const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
await page.locator(".card-shell").nth(idx).locator(".prospect-button").click({ force: true });
await page.waitForTimeout(300);
await page.locator(".card-shell").nth(idx).locator(".favorite-button").click({ force: true });
await page.waitForTimeout(800);
const info = await page.evaluate((i) => {
  const c = document.querySelectorAll(".card-shell")[i];
  const f = c.querySelector(".tc-frame"), n = c.querySelector(".tc-name-text");
  const cs = getComputedStyle(f), ns = getComputedStyle(n);
  return { classes: c.className, bg: cs.backgroundImage.slice(0, 170), shadow: cs.boxShadow.slice(0, 120),
           nameFill: ns.webkitTextFillColor, nameBg: ns.backgroundImage.slice(0, 80) };
}, idx);
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: "dual-before.png", clip: { x: 40, y: 240, width: 700, height: 460 } });
await browser.close();
