// 빌드 결과(dist)를 "더블클릭해서 열리는 단일 index.html"로 만듭니다.
// - CSS <link> → <style> 인라인
// - JS <script type="module"> → 일반 <script> 인라인
// - 인라인 스크립트는 </body> 직전에 넣어 #root 가 먼저 생성되게 함
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(import.meta.dirname, "..", "dist");
const indexPath = path.join(dist, "index.html");
let html = fs.readFileSync(indexPath, "utf8");

let inlineJs = "";

// 1) CSS 인라인 (있으면)
html = html.replace(/<link[^>]+rel="stylesheet"[^>]*href="\.?\/?assets\/([^"]+\.css)"[^>]*>/g, (_m, file) => {
  const css = fs.readFileSync(path.join(dist, "assets", file), "utf8");
  return `<style>\n${css}\n</style>`;
});

// 2) JS 추출 (modulepreload/script 태그 제거 후 나중에 body 끝에 삽입)
html = html.replace(/<script[^>]*src="\.?\/?assets\/([^"]+\.js)"[^>]*><\/script>/g, (_m, file) => {
  inlineJs = fs.readFileSync(path.join(dist, "assets", file), "utf8").replace(/<\/script>/gi, "<\\/script>");
  return "";
});
html = html.replace(/<link[^>]+rel="modulepreload"[^>]*>/g, "");

// 3) body 끝에 인라인 스크립트 삽입
if (inlineJs) {
  html = html.replace(/<\/body>/i, `  <script>\n${inlineJs}\n  </script>\n</body>`);
}

fs.writeFileSync(indexPath, html, "utf8");
const total = (fs.statSync(indexPath).size / 1024).toFixed(0);
console.log(`standalone index.html 완성 (${total} KB)`);
