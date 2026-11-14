
import { chromium, devices } from "playwright";
const base = "https://fomal258.github.io/fomal/?v=20";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(base, { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 45000 });
await page.waitForTimeout(2000);

const d = await page.evaluate(() => ({
  total: document.querySelector(".count")?.textContent,
  caps: [...new Set([...document.querySelectorAll(".card-caption")].slice(0, 10).map(e => Math.round(e.getBoundingClientRect().height)))],
  clipped: [...document.querySelectorAll(".tc-name-text")].filter(e => e.scrollWidth > e.clientWidth + 1).length
}));
console.log("desktop:", JSON.stringify(d));

await page.locator(".header-edit").first().focus();
console.log("focus ring:", await page.evaluate(() => {
  const cs = getComputedStyle(document.activeElement);
  return cs.outlineWidth + " " + cs.outlineColor;
}));

await page.locator(".card-caption").first().click();
await page.waitForSelector(".info-modal", { timeout: 10000 });
await page.waitForTimeout(400);
const trap = [];
for (let i = 0; i < 6; i++) { await page.keyboard.press("Tab"); trap.push(await page.evaluate(() => !!document.activeElement.closest("[role=dialog], .info-modal, .editor-modal"))); }
console.log("tab trap:", trap.every(Boolean));
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

const m = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
await m.goto(base, { waitUntil: "load" });
await m.waitForSelector(".card-shell");
await m.waitForTimeout(1500);
const mob = await m.evaluate(() => ({
  hero: Math.round(document.querySelector(".hero").getBoundingClientRect().height),
  firstCard: Math.round(document.querySelector(".card-shell").getBoundingClientRect().top + scrollY),
  caption: getComputedStyle(document.querySelector(".tc-name-text")).fontSize,
  total: document.querySelector(".count")?.textContent
}));
console.log("mobile:", JSON.stringify(mob));
const box = await m.locator(".card-edit").first().boundingBox();
await m.mouse.click(box.x + box.width / 2, box.y - 6);
await m.waitForTimeout(600);
console.log("hit-area (6px above icon) opens editor:", await m.locator(".editor-modal").count() > 0);
await m.keyboard.press("Escape");
await m.waitForTimeout(300);
await m.screenshot({ path: "polish-live-mobile.png" });
await page.screenshot({ path: "polish-live-desktop.png" });
console.log("errors:", errs.length ? errs.slice(0, 2) : "none");
await browser.close();
