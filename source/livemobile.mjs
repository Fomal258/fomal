import { chromium, devices } from "playwright";
const base = "https://fomal258.github.io/fomal/?v=3";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push("page: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 100)); });
await page.goto(base, { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 40000 });
await page.waitForSelector(".mobile-dock", { timeout: 15000 });
await page.waitForTimeout(1500);
console.log("cards:", await page.locator(".card-shell").count(), "| dock:", await page.locator(".mobile-dock").isVisible());
console.log("grid cols:", await page.evaluate(() => getComputedStyle(document.querySelector(".roster-grid")).gridTemplateColumns.split(" ").length));
await page.screenshot({ path: "../live-mobile-dock.png" });

await page.click('.mobile-dock button[data-act="sync"]');
await page.waitForSelector(".gh-quick", { timeout: 10000 });
await page.click('.gh-quick button[data-q="fill"]');
await page.waitForTimeout(600);
const vals = await page.evaluate(() => {
  const f = document.querySelector(".gh-sync-modal");
  return {
    owner: f.querySelector('input[placeholder*="my-github-id"]').value,
    repo: f.querySelector('input[placeholder*="ring-roster"]').value,
    branch: f.querySelector('input[placeholder="main"]').value,
    path: f.querySelector('input[placeholder="roster-data.json"]').value,
    status: f.querySelector(".gh-quick-status").textContent
  };
});
console.log("autofill:", JSON.stringify(vals));
await page.screenshot({ path: "../live-mobile-sync.png" });
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
