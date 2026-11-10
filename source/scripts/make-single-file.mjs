// dist/index.html 의 CSS·JS 를 전부 index.html 안으로 넣어
// 더블클릭만으로 열리는 파일 하나(roster-standalone.html)를 만듭니다.
// 사용법: npm run build:single

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const htmlPath = path.join(root, "dist", "index.html");
let html = fs.readFileSync(htmlPath, "utf-8");

// 1) CSS 인라인
const cssFile = html.match(/href="\.?\/?assets\/([^"]+\.css)"/)?.[1];
if (cssFile) {
  const css = fs.readFileSync(path.join(root, "dist", "assets", cssFile), "utf-8");
  html = html.replace(/<link[^>]*\.css"[^>]*>/, `<style>\n${css}\n</style>`);
}

// 2) JS 인라인 — base64 data URL 로 넣어 HTML 파싱 문제를 피합니다.
const jsFile = html.match(/<script[^>]*src="\.?\/?assets\/([^"]+\.js)"[^>]*><\/script>/)?.[1];
if (jsFile) {
  const js = fs.readFileSync(path.join(root, "dist", "assets", jsFile), "utf-8");
  const dataUrl = `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`;
  html = html.replace(/<script[^>]*src="[^"]+\.js"[^>]*><\/script>/, `<script type="module" src="${dataUrl}"></script>`);
}

// 3) 남은 외부 asset 링크 제거 (이미 인라인됨)
html = html.replace(/<link[^>]*rel="modulepreload"[^>]*>/g, "");

// 4) 파비콘도 파일 안에 넣어 혼자 들고 다닐 수 있게 합니다.
const iconPath = path.join(root, "client", "public", "mark.svg");
if (fs.existsSync(iconPath)) {
  const data = fs.readFileSync(iconPath).toString("base64");
  html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${data}" />`);
}

const out = path.join(root, "roster-standalone.html");
fs.writeFileSync(out, html);
console.log(`완성: ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
