
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push("pageerror: " + e.message.slice(0, 90)));
page.on("console", m => { if (m.type() === "error" && !/ERR_FILE_NOT_FOUND|roster-data/.test(m.text())) errs.push(m.text().slice(0, 80)); });

await page.goto("file:///home/fomal/index.html?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1500);

const counts = await page.evaluate(() => ({
  cards: document.querySelectorAll(".card-shell").length,
  buttons: document.querySelectorAll(".prospect-button").length,
  svg: document.querySelectorAll(".prospect-button svg.prospect-bell-svg").length
}));
console.log("injected:", JSON.stringify(counts));

const btn = page.locator(".prospect-button").first();
await btn.click({ force: true });
await page.waitForTimeout(500);
const on = await page.evaluate(() => {
  const card = document.querySelector(".card-shell");
  const b = card.querySelector(".prospect-button");
  return {
    shell: card.classList.contains("is-prospect"),
    btn: b.classList.contains("is-prospect"),
    pressed: b.getAttribute("aria-pressed"),
    frameBg: getComputedStyle(card.querySelector(".tc-frame")).backgroundImage.slice(0, 60),
    glow: getComputedStyle(card.querySelector(".tc-frame")).boxShadow.slice(0, 50)
  };
});
console.log("after click:", JSON.stringify(on, null, 1));

await page.waitForTimeout(400);
await page.screenshot({ path: "prospect-on.png", clip: { x: 40, y: 240, width: 900, height: 560 } });

await btn.click({ force: true });
await page.waitForTimeout(400);
console.log("toggled off:", await page.evaluate(() => !document.querySelector(".card-shell").classList.contains("is-prospect")));
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
