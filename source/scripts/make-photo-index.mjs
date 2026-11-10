// client/public/photos 폴더의 사진 목록을 index.json 으로 만들어 줍니다.
// 프로필 편집 팝업에서 "사진 파일 선택" 목록으로 쓰입니다.
// 사용법: npm run dev / npm run build 할 때 자동 실행 (predev, prebuild)

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "client", "public", "photos");
const out = path.join(dir, "index.json");

fs.mkdirSync(dir, { recursive: true });

const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"];
const files = fs
  .readdirSync(dir)
  .filter(name => allowed.includes(path.extname(name).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, "en"));

fs.writeFileSync(out, JSON.stringify(files, null, 2) + "\n", "utf-8");
console.log(`photos/index.json → ${files.length}개 파일`);
