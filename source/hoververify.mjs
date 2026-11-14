import { chromium } from "playwright";

const targets = process.argv.slice(2);
const browser = await chromium.launch();

for (const file of targets) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("file://" + file);
  await page.waitForSelector(".card-shell");
  await page.waitForTimeout(900);

  const pillState = await page.evaluate(() => {
    const pill = document.querySelector(".ctrl-hover-bg");
    return pill ? getComputedStyle(pill).display : "absent";
  });

  const rows = [];
  const n = await page.locator(".header-edit").count();
  for (let i = 0; i < n; i++) {
    await page.locator(".header-edit").nth(i).hover();
    await page.waitForTimeout(180);
    const r = await page.evaluate((idx) => {
      const btn = document.querySelectorAll(".header-edit")[idx];
      const cs = getComputedStyle(btn);
      // 헤더 영역에서 붉은 배경을 가진 요소가 남아있는지
      let redBlocks = 0;
      document.querySelectorAll(".site-header *").forEach(el => {
        const bg = getComputedStyle(el).backgroundColor;
        if (/rgba?\(2(0[0-9]|1[0-9]|2[0-9]), ?\d+, ?\d+/.test(bg)) redBlocks++;
      });
      return { bg: cs.backgroundColor, border: cs.borderColor, redBlocks };
    }, i);
    rows.push(r);
  }
  console.log("== " + file.split("/").pop() + " | pill display:", pillState);
  rows.forEach((r, i) => console.log("  btn" + i, JSON.stringify(r)));
  await page.locator(".header-edit").nth(3).hover();
  await page.waitForTimeout(200);
  await page.screenshot({ path: "hover-fixed-" + (file.includes("/source/") ? "source" : "live") + ".png", clip: { x: 820, y: 0, width: 620, height: 80 } });
  await page.close();
}
await browser.close();
