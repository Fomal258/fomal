import { chromium } from "playwright";
const base = "file://" + process.cwd() + "/dist/index.html";
const browser = await chromium.launch();
const desktop = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await desktop.goto(base);
await desktop.waitForSelector(".card-shell");
await desktop.waitForTimeout(1500);
await desktop.screenshot({ path: "../preview-desktop.png" });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await mobile.goto(base);
await mobile.waitForSelector(".card-shell");
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: "../preview-mobile.png" });

await desktop.goto(base + "?p=1-called-manders");
await desktop.waitForSelector(".info-modal");
await desktop.waitForTimeout(1000);
await desktop.screenshot({ path: "../preview-profile.png" });

await desktop.emulateMedia({ media: "print" });
await desktop.pdf({ path: "../preview-print.pdf", format: "A4", printBackground: true });
await browser.close();
console.log("ok");
