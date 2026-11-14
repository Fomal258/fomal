import { chromium, devices } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push("page: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 100)); });
await page.goto(base, { waitUntil: "load" });
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForSelector(".mobile-dock", { timeout: 10000 });
await page.waitForTimeout(1200);

const dockVisible = await page.locator(".mobile-dock").isVisible();
const cols = await page.evaluate(() => getComputedStyle(document.querySelector(".roster-grid")).gridTemplateColumns.split(" ").length);
const small = await page.evaluate(() => {
  const sels = [".header-edit", ".alpha-chip", ".columns-control button", ".search-box input"];
  const out = {};
  for (const s of sels) {
    const el = document.querySelector(s);
    if (!el) { out[s] = "none"; continue; }
    const r = el.getBoundingClientRect();
    out[s] = Math.round(r.width) + "x" + Math.round(r.height);
  }
  return out;
});
console.log("dock:", dockVisible, "| grid cols:", cols, "| tap sizes:", JSON.stringify(small));

await page.click('.mobile-dock button[data-act="favorites"]');
await page.waitForTimeout(900);
console.log("after 찜 tap → sort:", await page.locator('select[aria-label="로스터 정렬"]').inputValue(), "| cards:", await page.locator(".card-shell").count());

await page.click('.mobile-dock button[data-act="sync"]');
await page.waitForTimeout(900);
console.log("sync modal opened:", await page.locator(".gh-sync-modal").count() > 0);
if (await page.locator(".gh-sync-modal").count()) {
  console.log("modal fields:", await page.locator(".gh-sync-modal input").count());
}
await page.screenshot({ path: "../mobile-after.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(400);

const desk = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desk.goto(base);
await desk.waitForSelector(".card-shell");
await desk.waitForTimeout(800);
console.log("desktop dock visible (should be false):", await desk.locator(".mobile-dock").isVisible());
console.log("errors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
