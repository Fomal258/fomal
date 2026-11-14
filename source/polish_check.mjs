
import { chromium, devices } from "playwright";
const file = "file:///home/fomal/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push("page: " + e.message));
page.on("console", m => { if (m.type() === "error" && !/ERR_FILE_NOT_FOUND|roster-data/.test(m.text())) errs.push("console: " + m.text().slice(0, 90)); });
await page.goto(file + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1500);

// 1) 명판 높이 통일
const caps = await page.evaluate(() => {
  const hs = [...document.querySelectorAll(".card-caption")].slice(0, 8).map(e => Math.round(e.getBoundingClientRect().height));
  const ls = [...document.querySelectorAll(".tc-name-text")].slice(0, 5).map(e => getComputedStyle(e).letterSpacing);
  return { heights: [...new Set(hs)], letterSpacing: [...new Set(ls)] };
});
console.log("nameplate heights:", JSON.stringify(caps.heights), "| letter-spacing:", JSON.stringify(caps.letterSpacing));

// 2) 포커스 링
await page.locator(".header-edit").first().focus();
const focus = await page.evaluate(() => {
  const cs = getComputedStyle(document.activeElement);
  return { outline: cs.outlineWidth + " " + cs.outlineColor, offset: cs.outlineOffset };
});
console.log("focus ring:", JSON.stringify(focus));

// 3) 모달 포커스 트랩
await page.locator(".card-caption").first().click();
await page.waitForSelector(".info-modal");
await page.waitForTimeout(500);
const inside0 = await page.evaluate(() => !!document.activeElement.closest(".info-modal, .editor-modal, .design-modal, .site-hub-modal, .gh-sync-modal"));
const cycle = [];
for (let i = 0; i < 8; i++) {
  await page.keyboard.press("Tab");
  cycle.push(await page.evaluate(() => !!document.activeElement.closest(".info-modal, .editor-modal, .design-modal, .site-hub-modal, .gh-sync-modal")));
}
console.log("initial focus inside:", inside0, "| tab stays inside:", cycle.every(Boolean));
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
console.log("focus restored:", await page.evaluate(() => document.activeElement && document.activeElement.className.includes("card-caption")));

// 4) 모바일 밀도 + 히트 영역
const m = await (await browser.newContext({ ...devices["iPhone 13"] })).newPage();
await m.goto(file + "?q=");
await m.waitForSelector(".card-shell");
await m.waitForTimeout(1200);
console.log("mobile:", JSON.stringify(await m.evaluate(() => ({
  hero: Math.round(document.querySelector(".hero").getBoundingClientRect().height),
  firstCard: Math.round(document.querySelector(".card-shell").getBoundingClientRect().top + scrollY),
  favBox: (() => { const r = document.querySelector(".favorite-button").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })(),
  editBox: (() => { const r = document.querySelector(".card-edit").getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; })()
}))));

const beforeFav = await page.evaluate(() => document.querySelectorAll(".tile-champ, .is-champ").length);
const btn = await m.locator(".card-edit").first().boundingBox();
// 카드 아이콘 바로 위 6px 지점(히트 영역 확장 확인)
await m.mouse.click(btn.x + btn.width / 2, btn.y - 6);
await m.waitForTimeout(600);
console.log("hit-area click opened editor:", await m.locator(".editor-modal, .info-modal").count() > 0);
console.log("errors:", errs.length ? errs.slice(0, 3) : "none");
await browser.close();
