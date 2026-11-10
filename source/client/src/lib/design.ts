// 사이트 디자인(색·문구·메뉴) 설정입니다.
// 여기 기본값을 바꾸면 새로 접속한 화면에 바로 반영됩니다.
// 이미 브라우저에 저장된 값이 있으면, 화면의 "디자인 편집"에서 저장해야 바뀝니다.

// 헤더 메뉴 한 칸
type NavItem = { id: string; label: string; url: string };

// 히어로(첫 화면)에 들어가는 텍스트 블록
export type HeroBlock = {
  id: string;
  type: "eyebrow" | "title" | "text" | "button";
  text: string;
  url?: string; // type이 button일 때만 사용
};

export type SiteDesign = {
  showHeader: boolean; // 헤더 표시
  showBrand: boolean; // 로고 표시
  brandTop: string; // 로고 윗줄
  brandBottom: string; // 로고 아래줄
  headerBg: string; // 헤더 배경색
  headerText: string; // 헤더 글자색
  navItems: NavItem[];
  showHero: boolean; // 첫 화면 표시
  heroBg: string;
  heroText: string;
  heroImage: string; // 배경 이미지(data URL 또는 주소)
  heroAlign: "left" | "center" | "right";
  heroFilmSpeed: number; // 히어로 필름 스트립 이동 속도(%) — 0(정지) ~ 300(빠름), 기본 100
  heroBlocks: HeroBlock[];
  accent: string; // 포인트색
  profileHighlight: string; // 카드 호버 강조색
  profileModalBg: string; // 프로필 팝업 배경(단색)
  profileModalBgMode: "color" | "gradient" | "image"; // 배경 방식
  profileModalBgImage: string; // 배경 이미지 (data URL)
  profileModalGradientFrom: string; // 그라데이션 시작색
  profileModalGradientTo: string; // 그라데이션 끝색
  profileModalGradientAngle: number; // 그라데이션 각도(deg)
  profileModalBorder: string; // 팝업 테두리 색
  profileModalBorderWidth: number; // 팝업 테두리 두께(px)
  profileModalOverlay: number; // 배경 위를 어둡게 덮는 정도(%)
  profileModalAnimation: "none" | "fade" | "slide" | "zoom"; // 팝업 열림/닫힘 애니메이션
  profileModalDuration: number; // 애니메이션 속도(ms)
  profileModalHeaderBg: string;
  profileModalText: string;
  profileModalAccent: string;
  profileModalFieldBg: string;
  rosterTitle: string;
  rosterSubtitle: string;
  rosterBg: string; // 메인(로스터) 단색 배경
  rosterBgMode: "color" | "gradient" | "image"; // 메인(로스터) 배경 방식
  rosterBgImage: string; // 메인(로스터) 배경 이미지 (data URL)
  rosterGradientFrom: string; // 메인(로스터) 그라데이션 시작색
  rosterGradientTo: string; // 메인(로스터) 그라데이션 끝색
  rosterGradientAngle: number; // 메인(로스터) 그라데이션 각도(deg)
  rosterOverlay: number; // 메인(로스터) 배경 어둡게(%)
  rosterText: string;
  fontScale: number; // 전체 글자 크기(%) — 80~130
};

// 기본 디자인 값
export const defaultDesign: SiteDesign = {
  showHeader: true,
  showBrand: true,
  brandTop: "RING",
  brandBottom: "ROSTER",
  headerBg: "#070707",
  headerText: "#ffffff",
  navItems: [
    { id: "roster", label: "ROSTER", url: "#roster" },
    { id: "site", label: "SITE", url: "#site" },
  ],
  showHero: true,
  heroBg: "#0b0b0b",
  heroText: "#ffffff",
  heroImage: "",
  heroAlign: "center",
  heroFilmSpeed: 100,
  heroBlocks: [
    { id: "hero-eyebrow", type: "eyebrow", text: "THE STARS OF THE RING" },
    { id: "hero-title", type: "title", text: "MEET THE ROSTER" },
    { id: "hero-text", type: "text", text: "링을 빛내는 선수들을 만나보세요" },
  ],
  accent: "#d61a30",
  profileHighlight: "#d61a30",
  profileModalBg: "#ffffff",
  profileModalBgMode: "color",
  profileModalBgImage: "",
  profileModalGradientFrom: "#ffffff",
  profileModalGradientTo: "#f0e6ea",
  profileModalGradientAngle: 135,
  profileModalBorder: "#111111",
  profileModalBorderWidth: 0,
  profileModalOverlay: 0,
  profileModalAnimation: "fade",
  profileModalDuration: 260,
  profileModalHeaderBg: "#111111",
  profileModalText: "#111111",
  profileModalAccent: "#d61a30",
  profileModalFieldBg: "#fafafa",
  rosterTitle: "OUR ROSTER",
  rosterSubtitle: "각자의 이야기, 하나의 링. 우리 선수들을 소개합니다.",
  rosterBg: "#0b0b10",
  rosterBgMode: "color",
  rosterBgImage: "",
  rosterGradientFrom: "#0b0b10",
  rosterGradientTo: "#1f0d16",
  rosterGradientAngle: 155,
  rosterOverlay: 0,
  rosterText: "#f4f4f6",
  fontScale: 100,
};

// 브라우저에 저장된(혹은 예전 버전의) 값에 빠진 항목이 있어도 기본값으로 채워 줍니다.
export function normalizeDesign(saved: unknown): SiteDesign {
  const value = (saved ?? {}) as Partial<SiteDesign>;
  const isLegacyWhite = value.rosterBg === "#ffffff" && value.rosterText === "#111111";
  return {
    ...defaultDesign,
    ...value,
    rosterBg: isLegacyWhite ? defaultDesign.rosterBg : (value.rosterBg ?? defaultDesign.rosterBg),
    rosterText: isLegacyWhite ? defaultDesign.rosterText : (value.rosterText ?? defaultDesign.rosterText),
    rosterBgMode: value.rosterBgMode ?? defaultDesign.rosterBgMode,
    rosterBgImage: value.rosterBgImage ?? defaultDesign.rosterBgImage,
    rosterGradientFrom: value.rosterGradientFrom ?? defaultDesign.rosterGradientFrom,
    rosterGradientTo: value.rosterGradientTo ?? defaultDesign.rosterGradientTo,
    rosterGradientAngle: typeof value.rosterGradientAngle === "number" ? value.rosterGradientAngle : defaultDesign.rosterGradientAngle,
    rosterOverlay: typeof value.rosterOverlay === "number" ? value.rosterOverlay : defaultDesign.rosterOverlay,
    heroFilmSpeed: typeof value.heroFilmSpeed === "number" ? Math.min(300, Math.max(0, value.heroFilmSpeed)) : defaultDesign.heroFilmSpeed,
    navItems: Array.isArray(value.navItems) ? value.navItems : defaultDesign.navItems,
    heroBlocks: Array.isArray(value.heroBlocks) ? value.heroBlocks : defaultDesign.heroBlocks,
    fontScale: Math.min(130, Math.max(80, Number(value.fontScale) || 100)),
  };
}
