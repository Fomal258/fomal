
import { chromium, devices } from "playwright";
const file = "file:///home/fomal/source/dist/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
await page.goto(file + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1200);

const caps = await page.evaluate(() => [...new Set([...document.querySelectorAll(".card-caption")].slice(0, 8).map(e => Math.round(e.getBoundingClientRect().height)))]);
console.log("nameplate heights:", JSON.stringify(caps));

await page.locator(".card-caption").first().click();
await page.waitForSelector(".info-modal", { timeout: 8000 });
await page.waitForTimeout(400);
const inside = [];
for (let i = 0; i < 6; i++) {
  await page.keyboard.press("Tab");
  inside.push(await page.evaluate(() => !!document.activeElement.closest(".info-modal, .editor-modal, .design-modal, .site-hub-modal")));
}
console.log("modal tab trap (source build):", inside.every(Boolean));

const m = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
await m.goto(file + "?q=");
await m.waitForSelector(".card-shell");
await m.waitForTimeout(900);
console.log("mobile:", JSON.stringify(await m.evaluate(() => ({
  hero: Math.round(document.querySelector(".hero").getBoundingClientRect().height),
  firstCard: Math.round(document.querySelector(".card-shell").getBoundingClientRect().top + scrollY),
  caption: getComputedStyle(document.querySelector(".tc-name-text")).fontSize
}))));
console.log("errors:", errs.length ? errs.slice(0, 2) : "none");
await browser.close();
