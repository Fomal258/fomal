
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on("pageerror", e => logs.push("pageerror: " + e.message.slice(0, 200)));
page.on("console", m => logs.push(m.type() + ": " + m.text().slice(0, 160)));
await page.goto("http://localhost:8899/index.html");
await page.waitForTimeout(4000);
console.log("root length:", await page.evaluate(() => document.getElementById("root")?.innerHTML.length || 0));
console.log("body text:", (await page.evaluate(() => document.body.innerText)).slice(0, 160).replace(/\n/g, " | "));
console.log("logs:", logs.slice(0, 6));
await browser.close();
