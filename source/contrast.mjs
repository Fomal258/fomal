import { chromium } from "playwright";
const base = "file://" + process.cwd().replace(/\/source$/, "") + "/index.html";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base + "?q=");
await page.waitForSelector(".card-shell");
await page.waitForTimeout(1200);
const out = await page.evaluate(() => {
  function lum(c){const m=c.match(/[\d.]+/g).map(Number).slice(0,3).map(v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return 0.2126*m[0]+0.7152*m[1]+0.0722*m[2]}
  function bgOf(el){let n=el;while(n){const b=getComputedStyle(n).backgroundColor;if(b&&b!=="rgba(0, 0, 0, 0)"&&b!=="transparent")return b;n=n.parentElement}return "rgb(11,11,12)"}
  const sels = [".sort-control select",".roster-note",".tab-active",".under-grid",".alpha-chip",".search-box input",".section-heading p",".count",".header-edit",".card-caption",".add-card small"];
  return sels.map(s => {
    const el = document.querySelector(s);
    if (!el) return s + " | none";
    const cs = getComputedStyle(el);
    const fg = cs.color, bg = bgOf(el);
    const L1 = lum(fg), L2 = lum(bg);
    const ratio = ((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2);
    return s + " | fg " + fg + " on " + bg + " | " + ratio + ":1";
  });
});
out.forEach(o => console.log(out, o));
await browser.close();
