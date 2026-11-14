import { chromium } from "playwright";
const browser = await chromium.launch();
for (const file of process.argv.slice(2)) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("file://" + file);
  await page.waitForSelector(".card-shell");
  await page.waitForTimeout(900);

  const pre = await page.evaluate(() => {
    const pill = document.querySelector(".ctrl-hover-bg");
    const btns = [...document.querySelectorAll(".header-edit")];
    return {
      pill: pill ? getComputedStyle(pill).display : "absent",
      buttons: btns.length,
      disabled: btns.map(b => b.disabled),
      baseBg: btns.map(b => getComputedStyle(b).backgroundColor)
    };
  });

  const results = [];
  for (let i = 0; i < pre.buttons; i++) {
    await page.locator(".header-edit").nth(i).hover({ force: true });
    await page.waitForTimeout(200);
    const after = await page.evaluate((idx) => {
      const btn = document.querySelectorAll(".header-edit")[idx];
      const cs = getComputedStyle(btn);
      // 헤더 안에서 position:absolute 이면서 붉은 배경인 요소 = 따라다니는 하이라이트
      let movingRed = 0;
      document.querySelectorAll(".site-header *").forEach(el => {
        const s = getComputedStyle(el);
        if (s.position !== "absolute") return;
        if (s.display === "none" || s.opacity === "0") return;
        if (/rgba?\(2(0[0-9]|1[0-9]|2[0-9]), ?\d+, ?\d+/.test(s.backgroundColor)) movingRed++;
      });
      return { bg: cs.backgroundColor, movingRed };
    }, i);
    results.push({ i, hoverBg: after.bg, changed: after.bg !== pre.baseBg[i], movingRed: after.movingRed });
  }

  console.log("== " + file.split("/").slice(-2).join("/") + " | pill:", pre.pill, "| buttons:", pre.buttons);
  results.forEach(r => console.log("   btn" + r.i + " hoverBg=" + r.hoverBg + " changed=" + r.changed + " movingRedBlocks=" + r.movingRed));
  await page.locator(".header-edit").nth(Math.min(2, pre.buttons - 1)).hover({ force: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: "hoverfix-" + (file.includes("/source/") ? "source" : "live") + ".png", clip: { x: 780, y: 0, width: 660, height: 80 } });
  await page.close();
}
await browser.close();
