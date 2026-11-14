# RING ROSTER

프로레슬링 선수 프로필과 경기 영상·전적 링크를 관리하는 트레이딩 카드 아카이브 웹 애플리케이션입니다.

## 핵심 사양

- **프론트엔드 스택**: React 19, TypeScript, Vite, Lucide Icons
- **데이터 저장 방식**: 브라우저 로컬 저장소(IndexedDB) 및 GitHub REST API(`roster-data.json`) 실시간 동기화
- **디자인 시스템 (Unslop 적용)**:
  - 배경의 불필요한 네온·보라색 그라데이션 및 부유형 글로우 효과를 제거하고 매트 카본 다크(`#09090b`) 서피스로 통일
  - 시각적 강조는 **플래티넘 실버 크롬 프레임(일반 카드)**, **24K 골드 크롬 프레임(챔피언 찜 카드)**, **챔피언 벨트 메달리온**에만 집중
  - 헤더, 메인 메뉴, 우측 편집 메뉴의 모든 버튼을 `36px` 높이 · `8px` 간격 · `6px` 곡률로 통일하여 호버 영역을 1:1로 일치
  - 스마트폰·태블릿 환경에서 가로 터치 스크롤과 2~3열 자동 그리드로 동작하는 반응형 지원

## 실행 및 빌드

| 구분 | 실행 방법 | 설명 |
| --- | --- | --- |
| 단일 파일 실행 | `roster-standalone.html` 실행 | 별도 설치 없이 브라우저에서 즉시 동작 |
| 개발 서버 실행 | `npm install` → `npm run dev` | `http://localhost:5173` 실시간 미리보기 |
| 배포 파일 빌드 | `npm run build` | `dist/` 폴더에 정적 호스팅 파일 생성 |
| 단일 파일 갱신 | `npm run build:single` | 빌드 결과를 `roster-standalone.html` 한 파일로 병합 |

## 디렉터리 구조

```
ring-roster/
├─ index.html                  GitHub Pages 배포용 메인 엔트리
├─ roster-standalone.html      오프라인·단독 실행용 단일 HTML 파일
├─ roster-data.json            선수 명단·디자인·외부 사이트 데이터
├─ mark.svg                    브랜드 파비콘
├─ assets/                     번들링된 JS·CSS 정적 자산
├─ photos/                     선수 프로필 이미지 폴더
└─ source/                     React + TypeScript + Vite 원본 소스코드
```
