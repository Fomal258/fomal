// SITE 메뉴에 표시할 기본 외부 사이트 목록과 사용자 정의 가능한 카테고리 정의입니다.
// 기본값을 바꾸려면 defaultSiteCategories / defaultSites 배열을 수정하거나,
// 웹 화면의 SITE 모달에서 '카테고리 편집' 버튼으로 직접 추가·수정·삭제할 수 있습니다.

export type SiteCategoryItem = {
  key: string; // 고유 키 (예: "VIDEO", "PROMOTION", "cat-1730...")
  label: string; // 탭에 보이는 이름 (예: "VIDEO · 영상")
  color: string; // 카드 배지 배경색 (예: "#c9162b")
};

export type SiteItem = {
  id: string;
  title: string;
  url: string;
  category: string; // SiteCategoryItem.key 와 연결
  description: string;
  badge?: string; // 상단 강조 배지 (비우면 카테고리 key/label 표시)
  matchKeywords?: string[]; // 로스터 선수 링크나 소개에 이 키워드가 포함되면 '연동 선수 N명' 자동 계산
  favorite?: boolean;
};

// 기본 카테고리 목록 (화면에서 자유롭게 수정·추가·삭제 가능)
export const defaultSiteCategories: SiteCategoryItem[] = [
  { key: "VIDEO", label: "VIDEO · 영상", color: "#c9162b" },
  { key: "PROMOTION", label: "PROMOTION · 단체", color: "#111111" },
  { key: "STATS", label: "STATS · 전적/DB", color: "#1d4ed8" },
  { key: "NEWS", label: "NEWS · 뉴스/커뮤니티", color: "#6d28d9" },
  { key: "SHOP", label: "SHOP · 티켓/굿즈", color: "#047857" },
  { key: "ETC", label: "ETC · 기타", color: "#52525b" },
];

export const defaultSites: SiteItem[] = [
  {
    id: "site-youtube",
    title: "YouTube Pro Wrestling",
    url: "https://www.youtube.com/results?search_query=pro+wrestling+2026",
    category: "VIDEO",
    description: "로스터 등록 선수들의 최신 매치 하이라이트 및 풀 경기 영상 검색",
    badge: "MATCH VIDEO",
    matchKeywords: ["youtube.com", "youtu.be"],
    favorite: true,
  },
  {
    id: "site-cagematch",
    title: "CAGEMATCH — The Internet Wrestling Database",
    url: "https://www.cagematch.net/",
    category: "STATS",
    description: "전 세계 프로레슬링 선수 프로필, 타이틀 히스토리, 경기 평점 및 승률 데이터베이스",
    badge: "STATS DB",
    matchKeywords: ["cagematch"],
    favorite: true,
  },
  {
    id: "site-triller",
    title: "TrillerTV (FITE+) Wrestling",
    url: "https://www.trillertv.com/watch/wrestling/",
    category: "VIDEO",
    description: "글로벌 인디 레슬링 및 주요 단체 PPV 생중계 · 다시보기 스트리밍 플랫폼",
    badge: "LIVE PPV",
    matchKeywords: ["trillertv", "fite"],
    favorite: true,
  },
  {
    id: "site-profightdb",
    title: "The Internet Wrestling Database (IWD)",
    url: "http://www.profightdb.com/",
    category: "STATS",
    description: "연도별·단체별 PPV 대진표, 승패 기록 및 별점 통계 아카이브",
    badge: "ARCHIVE",
    matchKeywords: ["profightdb"],
  },
  {
    id: "site-wrestlingdata",
    title: "Wrestlingdata.com",
    url: "https://www.wrestlingdata.com/",
    category: "STATS",
    description: "선수별 상세 커리어 타임라인, 태그팀 이력 및 경기 통계 검색",
    badge: "TIMELINE",
    matchKeywords: ["wrestlingdata"],
  },
  {
    id: "site-tnawrestling",
    title: "TNA Wrestling Official",
    url: "https://tnawrestling.com/",
    category: "PROMOTION",
    description: "TNA 레슬링 공식 홈페이지 — 로스터, 이벤트 일정 및 최신 소식",
    badge: "PROMOTION",
    matchKeywords: ["tnawrestling", "impactwrestling"],
  },
  {
    id: "site-njpw",
    title: "NJPW WORLD / New Japan Pro-Wrestling",
    url: "https://www.njpw1972.com/",
    category: "PROMOTION",
    description: "신일본 프로레슬링 영문 공식 사이트 및 글로벌 투어 스케줄",
    badge: "PROMOTION",
    matchKeywords: ["njpw"],
  },
  {
    id: "site-prowrestlingtees",
    title: "Pro Wrestling Tees",
    url: "https://www.prowrestlingtees.com/",
    category: "SHOP",
    description: "인디 및 글로벌 프로레슬러 공식 티셔츠·머천다이즈 스토어",
    badge: "MERCH SHOP",
    matchKeywords: ["prowrestlingtees"],
  },
  {
    id: "site-postwrestling",
    title: "POST Wrestling",
    url: "https://www.postwrestling.com/",
    category: "NEWS",
    description: "글로벌 프로레슬링 업계 뉴스, 이벤트 리뷰 및 분석 리포트",
    badge: "NEWS & AUDIO",
    matchKeywords: ["postwrestling"],
  },
];

// URL에서 도메인 추출 (예: https://www.cagematch.net/ -> cagematch.net)
export const siteDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
