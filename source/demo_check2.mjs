import { chromium } from "playwright";
const file = "file:///home/fomal/unslop-motion-demo.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push("page: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 100)); });
await page.goto(file);
await page.waitForSelector(".card");
await page.waitForTimeout(1500);
await page.screenshot({ path: "demo-1-desktop.png" });

await page.locator(".card").nth(2).click();
await page.waitForTimeout(420);
await page.screenshot({ path: "demo-2-sheet.png" });
await page.keyboard.press("Escape");
await page.waitForTimeout(300);

const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const m = await mobile.newPage();
await m.goto(file);
await mobile.pages()[0].waitForSelector(".card");
await m.waitForTimeout(1200);
await mobile.pages()[0].locator('.dock button[data-act="sync"]').click();
await m.waitForTimeout(450);
const sync = await m.evaluate(() => ({
  open: document.querySelector("#syncSheet").classList.contains("open"),
  state: document.querySelector("#syncState").textContent
}));
console.log("sync sheet:", JSON.stringify(sync));
await m.screenshot({ path: "demo-3-mobile-sync.png" });

await mobile.pages()[0].locator("#syncNow").click();
await m.waitForTimeout(300);
console.log("during:", await mobile.pages()[0].evaluate(() => document.querySelector("#syncNow").textContent));
await m.waitForTimeout(900);
console.log("after:", await mobile.pages()[0].evaluate(() => ({
  btn: document.querySelector("#syncNow").textContent,
  state: document.querySelector("#syncState").textContent,
  time: document.querySelector("#syncTime").textContent
})));
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
