
import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto("http://localhost:8080/index-final.html");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1500);
await page.selectOption('select[aria-label="로스터 정렬"]', "default");
await page.waitForTimeout(800);
const idx = await page.evaluate(() => [...document.querySelectorAll(".card-shell")].findIndex(c => !c.classList.contains("is-champ")));
const name = await page.evaluate((i) => document.querySelectorAll(".card-shell")[i].querySelector(".tc-name-text").textContent.trim(), idx);
const click = async (sel) => page.evaluate(([n,s]) => {
  const c = [...document.querySelectorAll(".card-shell")].find(x => x.querySelector(".tc-name-text")?.textContent.trim() === n);
  c?.querySelector(s)?.click();
}, [name, sel]);
await click(".prospect-button"); await page.waitForTimeout(400);
await click(".favorite-button"); await page.waitForTimeout(1000);
console.log(JSON.stringify(await page.evaluate((n) => {
  const c = [...document.querySelectorAll(".card-shell")].find(x => x.querySelector(".tc-name-text")?.textContent.trim() === n);
  const cs = getComputedStyle(c.querySelector(".tc-frame"));
  return { cls: c.className, bg: cs.backgroundImage.slice(0, 220), shadow: cs.boxShadow.slice(0, 120) };
}, name), null, 1));
await browser.close();
