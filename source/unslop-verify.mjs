// unslop 검증 스크립트 — 빌드 결과(dist/index.html)를 실제 브라우저로 열어 규칙을 확인합니다.
// 사용법: node unslop-verify.mjs [dist/index.html 경로]
import { chromium, devices } from "playwright";

const target = process.argv[2] || "dist/index.html";
const file = "file://" + (target.startsWith("/") ? target : process.cwd() + "/" + target);
const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

const browser = await chromium.launch();

/* ── 데스크톱 ─────────────────────────────────────────────── */
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = [];
page.on("pageerror", e => errs.push(e.message));
page.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 100)); });
await page.goto(file);
await page.waitForSelector(".card-shell", { timeout: 30000 });
await page.waitForTimeout(1200);

const d = await page.evaluate(() => {
  const sizes = new Set();
  let shadows = 0;
  const emoji = [];
  const RE = /[\u{1F300}-\u{1FAFF}\u2705\u274C]/u;
  document.querySelectorAll("body *").forEach(el => {
    const cs = getComputedStyle(el);
    if (cs.textShadow !== "none") shadows++;
    if (!el.textContent || el.children.length || !el.getBoundingClientRect().width) return;
    sizes.add(Math.round(parseFloat(cs.fontSize)));
    if (RE.test(el.textContent)) emoji.push(el.textContent.trim().slice(0, 24));
  });
  const count = document.querySelector(".count");
  const add = document.querySelector(".add-card");
  const nameplate = new Set([...document.querySelectorAll(".tc-name-text")].map(e => Math.round(parseFloat(getComputedStyle(e).fontSize))));
  return {
    sizes: [...sizes].sort((a, b) => a - b),
    nameplateSteps: nameplate.size,
    shadows,
    emoji,
    countBg: count ? getComputedStyle(count).backgroundColor : null,
    addBg: add ? getComputedStyle(add).backgroundColor : null
  };
});

check("chrome text-shadow 0", d.shadows === 0, d.shadows + "개");
check("UI 이모지 0", d.emoji.length === 0, d.emoji.slice(0, 3).join(" / "));
check("렌더 폰트 크기 ≤ 16종", d.sizes.length <= 16, d.sizes.length + "종: " + d.sizes.join(","));
check("명판 크기 단계 ≤ 3", d.nameplateSteps <= 3, d.nameplateSteps + "단계");
check("개수 배지가 밝은 배경이 아님", !/255, 25[0-9]|250, 250, 250/.test(d.countBg || ""), d.countBg);
check("추가 카드가 다크 서피스", /rgb\((1[0-9]|2[0-9]), /.test(d.addBg || ""), d.addBg);

/* ── 모바일 ───────────────────────────────────────────────── */
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const m = await ctx.newPage();
await m.goto(file);
await m.waitForSelector(".card-shell");
await m.waitForTimeout(1000);

const mob = await m.evaluate(() => {
  const B = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect() : null; };
  const chips = [...document.querySelectorAll(".alpha-chip")];
  const cap = document.querySelector(".tc-name-text");
  const tap = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().height) : null; };
  return {
    caption: cap ? parseFloat(getComputedStyle(cap).fontSize) : null,
    chipRows: new Set(chips.map(c => Math.round(c.getBoundingClientRect().top))).size,
    chipH: chips[0] ? Math.round(chips[0].getBoundingClientRect().height) : null,
    cols: getComputedStyle(document.querySelector(".roster-grid")).gridTemplateColumns.split(" ").length,
    overflowX: document.documentElement.scrollWidth > window.innerWidth,
    headerTap: tap(".header-edit"),
    hero: Math.round(B(".hero")?.height || 0),
    firstCard: Math.round((B(".card-shell")?.top || 0) + scrollY)
  };
});

check("모바일 명판 ≤ 14px", (mob.caption || 99) <= 14, mob.caption + "px");
check("알파 필터 한 줄", mob.chipRows === 1, mob.chipRows + "줄");
check("알파 칩 터치 ≥ 44px", (mob.chipH || 0) >= 44, mob.chipH + "px");
check("모바일 2열", mob.cols === 2, mob.cols + "열");
check("가로 오버플로 없음", mob.overflowX === false, String(mob.overflowX));
check("헤더 버튼 터치 ≥ 44px", (mob.headerTap || 0) >= 44, mob.headerTap + "px");
check("히어로 ≤ 180px", mob.hero <= 180, mob.hero + "px");
check("첫 카드가 700px 이내", mob.firstCard <= 700, mob.firstCard + "px");

check("콘솔/페이지 에러 0", errs.filter(e => !/ERR_FILE_NOT_FOUND|roster-data/.test(e)).length === 0, errs.slice(0, 2).join(" | "));

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log((r.ok ? "PASS" : "FAIL") + "  " + r.name + (r.detail ? "  (" + r.detail + ")" : ""));
}
console.log("\n" + (results.length - failed) + "/" + results.length + " 통과");
process.exit(failed ? 1 : 0);
