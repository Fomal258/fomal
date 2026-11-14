import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message.slice(0, 70)));
await page.goto("file:///home/fomal/index.html?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1500);

await page.selectOption('select[aria-label="로스터 정렬"]', "asc");
await page.waitForTimeout(1000);

// 옵션 상태
console.log("options:", JSON.stringify(await page.evaluate(() => {
  const sel = document.querySelector('select[aria-label="로스터 정렬"]');
  return [...sel.options].map(o => o.value + ":" + o.textContent + (o.hidden ? "(hidden)" : ""));
})));

// 유망주 → 찜 순서로 클릭 (React 재렌더 유발)
const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
const card = page.locator(".card-shell").nth(idx);
await card.locator(".prospect-button").click({ force: true });
await page.waitForTimeout(600);
await card.locator(".favorite-button").click({ force: true });
await page.waitForTimeout(1500);

console.log("dual state:", JSON.stringify(await page.evaluate((i) => {
  const c = document.querySelectorAll(".card-shell")[i];
  const cs = getComputedStyle(c.querySelector(".tc-frame"));
  const layers = cs.backgroundImage.split("),").length;
  return {
    champ: c.classList.contains("is-champ"),
    prospect: c.classList.contains("is-prospect"),
    hasGold: cs.backgroundImage.includes("240, 198, 96") || cs.backgroundImage.includes("250, 226, 140"),
    hasBlue: cs.backgroundImage.includes("96, 165, 250") || cs.backgroundImage.includes("160, 205, 255"),
    layers,
    nameBg: getComputedStyle(c.querySelector(".tc-name-text")).backgroundImage.slice(0, 70)
  };
}, idx)));
await page.screenshot({ path: "dual-after.png", clip: { x: 40, y: 240, width: 700, height: 460 } });

// 유망주 필터
await page.selectOption('select[aria-label="로스터 정렬"]', "prospects");
await page.waitForTimeout(1200);
console.log("filter:", JSON.stringify(await page.evaluate(() => ({
  gridClass: document.querySelector(".roster-grid").className,
  visibleCards: [...document.querySelectorAll(".card-shell")].filter(c => c.getBoundingClientRect().height > 0).length,
  total: document.querySelectorAll(".card-shell").length,
  count: document.querySelector(".count")?.textContent
}))));
await page.screenshot({ path: "prospect-filter.png", clip: { x: 0, y: 200, width: 1440, height: 560 } });
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
