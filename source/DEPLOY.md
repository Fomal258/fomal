# 배포/업데이트할 때 뭘 올리나

## 1) 단일 HTML만 쓰는 경우 → 파일 1개

`roster-standalone.html` **하나만** 교체하면 끝입니다. (CSS·JS·파비콘이 안에 다 들어 있음)

- 소스를 고쳤다면 `npm run build:single` 로 다시 만든 뒤 그 파일을 올리세요.
- 선수 사진·이름·디자인 설정은 이 파일에 들어가지 않습니다. 브라우저(IndexedDB)에 저장됩니다.

## 2) 일반 웹 호스팅(Vercel·Netlify·Cloudflare Pages·카페24 등) → `dist/` 폴더 전체

```bash
npm install      # 처음 한 번만
npm run build    # dist/ 생성
```

**dist/ 안의 파일을 모두 올립니다.**

- `.card-image` → `dist/index.html`
- `dist/mark.svg`
- `dist/assets/index-XXXXXXXX.js`
- `dist/assets/index-XXXXXXXX.css`

`index.html`만 올리면 안 됩니다. 파일명에 해시가 붙어 있어서, HTML이 가리키는 JS/CSS가 함께 있어야 화면이 뜹니다.
새로 빌드하면 해시가 바뀌므로 이전 `assets/` 는 지우고 폴더째 교체하세요.
사이트를 하위 경로(`/roster/`)에 올린다면 `vite.config.ts` 에 `base: "/roster/"` 를 추가하고 다시 빌드합니다.

## 3) VS Code에서 소스로 관리하는 경우 → 프로젝트 폴더 전체

이번 작업에서 바뀐 파일은 아래와 같습니다. 전체를 덮어써도 됩니다.

| 파일 | 내용 |
| --- | --- |
| `client/src/components/ImageCropper.tsx` | 새 파일 — 사진 위치·크기 조절, 스냅, 방향키 이동 |
| `client/src/components/ListRows.tsx` | 새 파일 — 이름/링크 여러 줄 입력(드래그 순서 변경) |
| `client/src/components/ProfileEditor.tsx` | 사진 크롭 연결, 이름/링크 목록 UI |
| `client/src/components/RosterSection.tsx` | 정렬(최신/오래된), 첫 글자 필터, 링크 선택 팝업, 카드 이미지 크롭 적용 |
| `client/src/components/ProfileInfoModal.tsx` | 링크 목록 표시, 크롭 반영 |
| `client/src/lib/storage.ts` | names[], links[], imageCrop, createdAt, 정렬 타입 |
| `client/src/data/roster.ts` | 기본 명단을 names/links 구조로 |
| `client/src/pages/Home.tsx` | 저장 흐름(이름·링크·크롭), 등록 시각 기록 |
| `client/src/components/DesignEditor.tsx` | 색상 입력을 배열로 정리 |
| `client/src/index.css` | 크롭·필터·목록 스타일, 미사용 규칙 삭제 |
| `README.md`, `DEPLOY.md` | 문서 |
| `scripts/make-single-file.mjs` | 단일 HTML 생성 스크립트(JS를 base64로 인라인) |

의존성은 `react`, `react-dom`, `lucide-react` 뿐이라, 다른 PC에서 처음 열 때만 `npm install` 하면 됩니다.

## 3-2) 사진 폴더

선수 사진을 `public/photos` 에 넣었다면 빌드 결과의 `dist/photos/` 폴더도 함께 올려야 합니다. 그래야 방문자 모두 같은 사진을 봅니다.

## 4) 자주 하는 실수

- `node_modules/`, `dist/` 는 소스 저장소에 올리지 않습니다.
- 사진을 새로 등록해도 파일에는 저장되지 않습니다. 다른 사람에게 보이게 하려면 서버 스토리지가 필요합니다.
- 예전 버전에서 쓰던 브라우저 데이터는 그대로 호환됩니다(단일 이름 → names[], 단일 링크 → links[] 자동 변환).
