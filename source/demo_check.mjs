import { chromium } from "playwright";
const file = "file:///home/fomal/unslop-motion-demo.html";
const browser = await chromium.launch();

const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push("page: " + e.message));
page.on("console", m => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 120)); });
await page.goto(file);
await page.waitForSelector(".card");
await page.waitForTimeout(1800);

const base = await page.evaluate(() => {
  const card = document.querySelector(".card");
  const cs = getComputedStyle(card);
  const anims = document.getAnimations();
  return {
    cards: document.querySelectorAll(".card").length,
    border: cs.borderColor, bg: cs.backgroundColor,
    revealIn: card.classList.contains("is-in"),
    infiniteAnims: anims.filter(a => (a.effect?.getTiming?.().iterations || 1) === Infinity).length,
    count: document.querySelector("#visibleCount").textContent
  };
});
console.log("base:", JSON.stringify(base));

await page.locator(".card").first().hover();
await page.waitForTimeout(320);
const hov = await page.evaluate(() => {
  const cs = getComputedStyle(document.querySelector(".card"));
  return { border: cs.borderColor, bg: cs.backgroundColor, transform: cs.transform };
});
console.log("hover:", JSON.stringify(hov), "| changed:", hov.border !== base.border || hov.bg !== base.bg);

await page.locator(".card").first().click();
await page.waitForTimeout(420);
console.log("sheet:", JSON.stringify(await page.evaluate(() => {
  const s = document.querySelector("#sheet"), cs = getComputedStyle(s);
  return { open: s.classList.contains("open"), opacity: cs.opacity, transform: cs.transform, name: document.querySelector("#sheetName").textContent };
})));
await page.keyboard.press("Escape");
await page.waitForTimeout(320);
console.log("sheet closed:", await page.evaluate(() => !document.querySelector("#sheet").classList.contains("open")));

await page.fill("#q", "adam");
await page.waitForTimeout(520);
console.log("search:", JSON.stringify(await page.evaluate(() => ({ visible: document.querySelectorAll(".card").length, count: document.querySelector("#visibleCount").textContent }))));

await page.fill("#q", "");
await page.waitForTimeout(420);
const beforeFav = await page.evaluate(() => document.querySelector("#heroFav").textContent);
await page.locator(".card .fav").first().click();
await page.waitForTimeout(450);
console.log("fav:", beforeFav, "->", await page.evaluate(() => document.querySelector("#heroFav").textContent));

await page.evaluate(() => window.scrollTo(0, 900));
await page.waitForTimeout(520);
console.log("scroll:", JSON.stringify(await page.evaluate(() => ({
  compact: document.querySelector("#siteHeader").classList.contains("is-compact"),
  stuck: document.querySelector("#toolbar").classList.contains("is-stuck")
}))));
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(450);
await page.screenshot({ path: "demo-desktop.png" });

const rm = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce", deviceScaleFactor: 2 });
const p2 = await rm.newPage();
await p2.goto(file);
await p2.waitForSelector(".card");
await p2.waitForTimeout(600);
console.log("reduced-motion:", JSON.stringify(await p2.evaluate(() => ({
  revealOpacity: getComputedStyle(document.querySelector(".card")).opacity,
  anims: document.getAnimations().length,
  dock: Boolean(document.querySelector(".dock"))
}))));
await p2.screenshot({ path: "demo-mobile.png" });

console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
