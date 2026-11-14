import { chromium, devices } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], permissions: ["clipboard-read", "clipboard-write"] });
const page = await ctx.newPage();
const errs = [];
page.on("pageerror", e => errs.push("page: " + e.message));
page.on("console", m => { if (m.type() === "error" && !m.text().includes("ERR_FILE_NOT_FOUND") && !m.text().includes("roster-data.json")) errs.push("console: " + m.text().slice(0, 120)); });
await page.goto(base);
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForSelector(".mobile-dock");
await page.click('.mobile-dock button[data-act="sync"]');
await page.waitForSelector(".gh-quick", { timeout: 8000 });
console.log("quick panel:", await page.locator(".gh-quick").isVisible(), "| buttons:", await page.locator(".gh-quick button").count());
const sizes = await page.evaluate(() => [...document.querySelectorAll(".gh-quick button")].map(b => Math.round(b.getBoundingClientRect().height)));
console.log("button heights:", sizes.join(","));

await page.click('.gh-quick button[data-q="check"]');
await page.waitForTimeout(500);
console.log("check w/o token:", (await page.locator(".gh-quick-status").innerText()).trim());

// 클립보드에 가짜 토큰 넣고 붙여넣기 테스트
await page.evaluate(() => navigator.clipboard.writeText("ghp_dummy_token_for_test"));
await page.click('.gh-quick button[data-q="paste"]');
await page.waitForTimeout(600);
const tokenVal = await page.locator('.gh-sync-modal input[type="password"]').inputValue();
console.log("pasted token length:", tokenVal.length, "| status:", (await page.locator(".gh-quick-status").innerText()).trim());

await page.click('.gh-quick button[data-q="check"]');
await page.waitForTimeout(2500);
console.log("check with bad token:", (await page.locator(".gh-quick-status").innerText()).trim());
await page.screenshot({ path: "../mobile-sync-sheet.png" });
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
