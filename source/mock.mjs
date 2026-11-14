import { chromium } from "playwright";
const browser = await chromium.launch();

// 1) 현재 라이브
const live = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await live.goto("https://fomal258.github.io/fomal/?v=17", { waitUntil: "load" });
await live.waitForSelector(".card-shell", { timeout: 40000 });
await live.waitForTimeout(1800);
await live.screenshot({ path: "../cmp-current.png" });

// 2) 시안 데스크톱
const c = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
const bad = [];
c.on("response", r => { if (r.status() >= 400) bad.push(r.status() + " " + r.url().split("/").pop()); });
await c.goto("file:///home/fomal/unslop-concept.html");
await c.waitForTimeout(2500);
const imgs = await c.evaluate(() => [...document.images].map(i => [i.src.split("/").pop(), i.naturalWidth]));
await c.screenshot({ path: "../cmp-concept.png" });
console.log("broken images:", bad.slice(0, 6), "| img widths:", imgs.slice(0, 4));

// 3) 시안 모바일
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto("file:///home/fomal/unslop-concept.html");
await m.waitForTimeout(2000);
await m.screenshot({ path: "../cmp-concept-mobile.png" });
await browser.close();
