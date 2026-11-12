import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { ChevronDown, Grid2X2, Heart, ImagePlus, Minus, Pencil, Plus, RotateCw, Search, Star, X } from "lucide-react";
import type { SiteDesign } from "@/lib/design";
import { hasPhotoIndex, imageOf, probePhoto } from "@/data/photos";
import { cropTransform, displayName, linkLabel, wrestlerLinks, wrestlerNames, type RosterState, type SortOrder, type Wrestler } from "@/lib/storage";
import { readRosterUrl, writeRosterUrl } from "@/lib/urlState";

type Props = {
  design: SiteDesign;
  roster: RosterState;
  visibleColumns: number; // 화면 폭에 맞춰 실제로 그릴 열 수
  ready: boolean; // 로스터를 다 불러왔는지
  loadFailed: boolean;
  storageError: boolean;
  manageMode: boolean; // 카드 클릭 = 편집
  editable: boolean;
  onSort: (order: RosterState["sortOrder"]) => void;
  onColumns: (delta: number) => void;
  onToggleFavorite: (id: string) => void;
  onEdit: (wrestler: Wrestler) => void;
  onAdd: () => void;
  onInfo: (wrestler: Wrestler) => void;
};

type Picker = { wrestler: Wrestler; top: number; left: number };

// 시드 기반 셔플 (같은 시드면 항상 같은 순서 → 리렌더에도 순서가 흔들리지 않음)
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const shuffleBySeed = <T,>(list: T[], seed: number) => {
  const rand = mulberry32(seed);
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// 이름의 첫 글자를 필터 키로 바꿉니다. 숫자 → "#", A~Z → 해당 알파벳, 그 외 → "기타"
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const initialOf = (name: string) => {
  const first = name.trim().charAt(0).toUpperCase();
  if (/[0-9]/.test(first)) return "#";
  if (/[A-Z]/.test(first)) return first;
  return "기타";
};
const letterKeys = ["all", "#", ...ALPHABET, "기타"];

// 선수 이름에서 포스터 워터마크용 이니셜(2~3글자) 추출
const monogramOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || "WR";
};

// 링크 주소에서 사이트 이름만 뽑습니다. (잘못된 주소여도 화면이 깨지지 않게)
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

// ② 챔피언십 벨트(Championship Belt) 커스텀 아이콘 (ON: 럭셔리 골드 크롬 그라데이션 + 입체 금색 별 / OFF: 실버 크롬 라인)
function ChampBeltIcon({ active }: { active: boolean }) {
  const strokeUrl = active ? "url(#belt-lux-gold-grad)" : "url(#belt-silver-grad)";
  return (
    <svg className="champ-belt-svg" viewBox="0 0 36 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="belt-lux-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fff6d6" />
          <stop offset="28%" stopColor="#e6be6a" />
          <stop offset="52%" stopColor="#b38228" />
          <stop offset="76%" stopColor="#f7df94" />
          <stop offset="100%" stopColor="#8c6014" />
        </linearGradient>
        <linearGradient id="belt-lux-star-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="25%" stopColor="#ffe89e" />
          <stop offset="55%" stopColor="#d49e32" />
          <stop offset="78%" stopColor="#ffefb5" />
          <stop offset="100%" stopColor="#9c6c15" />
        </linearGradient>
        <linearGradient id="belt-silver-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#cfd6e0" />
          <stop offset="65%" stopColor="#8c95a4" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      {/* 좌·우 벨트 스트랩 (배경 완전 투명) */}
      <path
        className="belt-strap"
        d="M9.5 6.5H3C1.9 6.5 1 7.4 1 8.5V15.5C1 16.6 1.9 17.5 3 17.5H9.5M26.5 6.5H33C34.1 6.5 35 7.4 35 8.5V15.5C35 16.6 34.1 17.5 33 17.5H26.5"
        fill="none"
        stroke={strokeUrl}
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 좌·우 사이드 플레이트 (배경 완전 투명) */}
      <rect
        x="3.2"
        y="8.4"
        width="4.4"
        height="7.2"
        rx="0.9"
        fill="none"
        stroke={strokeUrl}
        strokeWidth="1.3"
      />
      <rect
        x="28.4"
        y="8.4"
        width="4.4"
        height="7.2"
        rx="0.9"
        fill="none"
        stroke={strokeUrl}
        strokeWidth="1.3"
      />
      {/* 중앙 팔각형 메인 챔피언십 플레이트 (배경 완전 투명) */}
      <path
        className="belt-center-plate"
        d="M13.2 3L22.8 3L26.8 7.5V16.5L22.8 21H13.2L9.2 16.5V7.5L13.2 3Z"
        fill="none"
        stroke={strokeUrl}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* 메인 플레이트 내부 2중 테두리 (배경 완전 투명) */}
      <path
        d="M14.3 5.2H21.7L24.5 8.4V15.6L21.7 18.8H14.3L11.5 15.6V8.4L14.3 5.2Z"
        fill="none"
        stroke={strokeUrl}
        strokeOpacity={active ? "0.9" : "0.55"}
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      {/* 플레이트 정중앙 크롬 골드 별 */}
      <polygon
        className="belt-center-star"
        points="18,7.1 19.4,10.3 22.8,10.65 20.2,12.9 21.0,16.25 18,14.45 15.0,16.25 15.8,12.9 13.2,10.65 16.6,10.3"
        fill={active ? "url(#belt-lux-star-grad)" : "none"}
        stroke={active ? "#fff9db" : strokeUrl}
        strokeWidth={active ? "0.75" : "1.25"}
        strokeLinejoin="round"
      />
    </svg>
  );
}

// 카드 한 장 (① 트레이딩 카드 프레임 + ② 실루엣 포스터 플레이스홀더 + ④ 3D 틸트·광택·챔피언십 골드)
function Card({
  wrestler,
  index,
  manageMode,
  editable,
  onEdit,
  onInfo,
  onToggleFavorite,
  onPickLinks,
  revealRef,
  revealDelay = 0,
  animate = false,
  order = 0,
}: {
  wrestler: Wrestler;
  index: number;
  manageMode: boolean;
  editable: boolean;
  onEdit: (w: Wrestler) => void;
  onInfo: (w: Wrestler) => void;
  onToggleFavorite: (id: string) => void;
  onPickLinks: (w: Wrestler, anchor: HTMLElement) => void;
  animate?: boolean;
  order?: number;
  revealRef?: (node: HTMLElement | null) => void;
  revealDelay?: number;
}) {
  const links = wrestlerLinks(wrestler);
  const name = displayName(wrestler);
  const monogram = monogramOf(name);
  const photo = imageOf({ image: wrestler.image, names: wrestlerNames(wrestler) });
  const [failed, setFailed] = useState(false); // 사진 파일이 아직 없을 때 깨진 아이콘 대신 실루엣 포스터
  const [autoPhoto, setAutoPhoto] = useState(""); // index.json 없이 자동으로 찾은 사진
  const shellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setFailed(false), [photo]);

  // 목록(index.json)이 비어 있으면 파일명 규칙으로 직접 찾아봅니다.
  useEffect(() => {
    if (photo || hasPhotoIndex) return;
    let cancelled = false;
    probePhoto(wrestlerNames(wrestler)).then(found => {
      if (!cancelled && found) setAutoPhoto(found);
    });
    return () => {
      cancelled = true;
    };
  }, [photo, wrestler.id]);

  // ④ 3D 마우스 틸트 & 홀로그램 광택(Glare) 좌표 업데이트
  const onMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = shellRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rx = (0.5 - py) * 11; // 상하 기울기 (deg)
    const ry = (px - 0.5) * 13; // 좌우 기울기 (deg)
    el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
  };

  const onMouseLeave = () => {
    const el = shellRef.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--gx", "50%");
    el.style.setProperty("--gy", "50%");
  };

  const hasPhoto = Boolean((photo || autoPhoto) && !failed);

  // 사진 영역 (순번 제거, 찜한 선수만 ★ MAIN EVENT 배지 표시)
  const image = (
    <div className={`card-image ${hasPhoto ? "has-photo" : "is-poster"}`}>

      {hasPhoto ? (
        <>
          {<span className="card-fill" style={{ backgroundImage: `url("${photo || autoPhoto}")` }} />}
          <div className={`card-stage ${(wrestler.imageCrop?.zoom ?? 1) < 1 ? "is-shrunk" : ""}`} style={{ transform: cropTransform(wrestler.imageCrop) }}>
            <img
              src={photo || autoPhoto}
              alt={`${name} 프로필`}
              loading={index > 6 ? "lazy" : "eager"}
              decoding="async"
              fetchPriority={index > 6 ? "low" : "high"}
              draggable={false}
              onError={() => setFailed(true)}
            />
          </div>
          <span className="tc-photo-shade" aria-hidden="true" />
        </>
      ) : (
        <div className="silhouette-poster" aria-hidden="true">
          <span className="silhouette-bg-glow" />
          <span className="silhouette-watermark">{monogram}</span>
          <svg className="silhouette-svg" viewBox="0 0 200 240" fill="none">
            <path
              d="M100 26C82 26 69 40 69 59C69 73 76 85 86 91L81 101C52 108 28 126 19 156L8 232H192L181 156C172 126 148 108 119 101L114 91C124 85 131 73 131 59C131 40 118 26 100 26Z"
              fill="currentColor"
            />
            <path
              d="M58 148L76 178L100 162L124 178L142 148"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="silhouette-sub">{manageMode ? "클릭하여 사진 등록" : "RING ROSTER SUPERSTAR"}</span>
          {manageMode && (
            <span className="silhouette-edit-chip">
              <ImagePlus size={13} /> 사진 추가
            </span>
          )}
        </div>
      )}

      {/* ④ 홀로그램 스포트라이트 광택 레이어 */}
      <span className="tc-holo-glare" aria-hidden="true" />
    </div>
  );

  // 편집 모드면 편집, 링크 1개면 바로 이동, 2개 이상이면 선택 팝업, 없으면 정보 팝업
  const imageAction = manageMode ? (
    <button className="card-image-button" disabled={!editable} onClick={() => onEdit(wrestler)} aria-label={`${name} 프로필 편집`}>
      {image}
    </button>
  ) : links.length === 1 ? (
    <a className="card-image-link" href={links[0]} target="_blank" rel="noopener noreferrer" aria-label={`${name} ${linkLabel(links[0])} 열기 (새 탭)`}>
      {image}
    </a>
  ) : links.length > 1 ? (
    <button className="card-image-button" onClick={event => onPickLinks(wrestler, event.currentTarget)} aria-label={`${name} 링크 ${links.length}개 중 선택`}>
      {image}
    </button>
  ) : (
    <button className="card-image-button" onClick={() => onInfo(wrestler)} aria-label={`${name} 정보 보기`}>
      {image}
    </button>
  );

  return (
    <div
      className={`card-shell tc-shell ${wrestler.favorite ? "is-champ" : ""} ${animate ? "is-filtering" : ""}`}
      ref={node => {
        shellRef.current = node;
        if (revealRef) revealRef(node);
      }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{ transitionDelay: `${revealDelay}ms`, "--i": order } as CSSProperties}
    >
      <div className={`wrestler-card tc-frame ${manageMode ? "editing" : ""}`}>
        {imageAction}
        {/* ① 하단 메탈릭 네임플레이트 */}
        <button className="card-caption tc-nameplate" onClick={() => onInfo(wrestler)} aria-label={`${name} 선수 정보 보기`}>
          <span className={`tc-name-text ${name.length > 20 ? "is-xlong" : name.length > 14 ? "is-long" : ""}`}>{name}</span>
          <span className="card-arrow">↗</span>
        </button>
      </div>
      <button
        type="button"
        className="card-edit"
        disabled={!editable}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          onEdit(wrestler);
        }}
        aria-label={`${name} 프로필 수정`}
        title={`${name} 프로필 수정`}
      >
        <Pencil size={14} />
      </button>
      <button
        type="button"
        className={`favorite-button ${wrestler.favorite ? "is-favorite" : ""}`}
        onClick={() => onToggleFavorite(wrestler.id)}
        aria-label={wrestler.favorite ? `${name} 찜 해제` : `${name} 찜하기`}
      >
        <ChampBeltIcon active={Boolean(wrestler.favorite)} />
      </button>
    </div>
  );
}

// 카드가 화면에 들어오면 is-visible 을 붙여 스크롤 등장 효과를 냅니다.
function useRevealRef() {
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => () => observer.current?.disconnect(), []);

  return (node: HTMLElement | null) => {
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (!observer.current) {
      observer.current = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.current?.unobserve(entry.target);
          });
        },
        { rootMargin: "0px 0px -6% 0px", threshold: 0.04 }
      );
    }
    observer.current.observe(node);
  };
}

// 로스터 영역: 제목 + 정렬/검색/열 조절 + 카드 그리드
export default function RosterSection(props: Props) {
  const { design, roster, visibleColumns, ready, loadFailed, storageError, manageMode, editable } = props;

  // 검색어와 자동완성 목록은 이 컴포넌트 안에서만 씁니다.
  // 처음 값은 주소(?q=&letter=)에서 읽어, 공유한 화면이 그대로 열리게 합니다.
  const [query, setQuery] = useState(() => readRosterUrl().q);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  // 링크가 2개 이상인 카드를 눌렀을 때 뜨는 작은 선택 팝업
  const [picker, setPicker] = useState<Picker | null>(null);
  // 이름 첫 글자 필터 ("all" | "#" | "A".."Z" | "기타")
  const [letter, setLetter] = useState(() => readRosterUrl().letter);
  const revealRef = useRevealRef(); // 카드 스크롤 등장
  const [motionTick, setMotionTick] = useState(0); // 필터가 바뀔 때마다 카드 등장 모션 재생
  const [stuck, setStuck] = useState(false); // 툴바가 상단에 붙었는지
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000)); // 랜덤 정렬용
  const toolbarRef = useRef<HTMLDivElement>(null);
  const prevSort = useRef(roster.sortOrder);
  const firstRun = useRef(true);
  const [revealOn] = useState(() => typeof IntersectionObserver !== "undefined");

  // 카드 바로 아래에 팝업을 띄우고, 아래 공간이 없으면 카드 위로 올립니다.
  const openPicker = (wrestler: Wrestler, anchor: HTMLElement) => {
    const rect = (anchor.closest(".card-shell") ?? anchor).getBoundingClientRect();
    const height = 46 + wrestlerLinks(wrestler).length * 34;
    const below = rect.bottom + 8;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 8) : below;
    setPicker({ wrestler, top, left: Math.min(rect.left, window.innerWidth - 208) });
  };

  // Esc 로 링크 팝업 닫기
  useEffect(() => {
    if (!picker) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setPicker(null);
    document.addEventListener("keydown", onKeyDown as unknown as EventListener);
    return () => document.removeEventListener("keydown", onKeyDown as unknown as EventListener);
  }, [picker]);

  // 첫 글자 필터 → 이름 검색 → 정렬 순서로 목록을 만듭니다.
  const filtered = (() => {
    const byLetter = roster.wrestlers.filter(w => letter === "all" || initialOf(displayName(w)) === letter);
    const keyword = query.trim().toLocaleLowerCase();
    // 이름이 여러 개면 어느 이름으로 검색해도 찾아집니다.
    const matched = byLetter.filter(w => wrestlerNames(w).some(name => name.toLocaleLowerCase().includes(keyword)));
    const byName = (a: Wrestler, b: Wrestler) => displayName(a).localeCompare(displayName(b), "en", { sensitivity: "base" });
    const registered = (w: Wrestler) => w.createdAt ?? 0;
    if (roster.sortOrder === "favorites") return matched.filter(w => w.favorite).sort(byName);
    if (roster.sortOrder === "asc") return [...matched].sort(byName);
    if (roster.sortOrder === "desc") return [...matched].sort((a, b) => byName(b, a));
    if (roster.sortOrder === "newest") return [...matched].sort((a, b) => registered(b) - registered(a));
    if (roster.sortOrder === "oldest") return [...matched].sort((a, b) => registered(a) - registered(b));
    if (roster.sortOrder === "random") return shuffleBySeed(matched, seed);
    return matched;
  })();

  // 첫 글자별 인원수 (빈 글자는 흐리게 표시)
  const letterCounts = roster.wrestlers.reduce<Record<string, number>>((acc, w) => {
    const key = initialOf(displayName(w));
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  // 검색어·첫 글자·정렬·열 수를 주소에 반영합니다. (새로고침·공유해도 같은 화면)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      writeRosterUrl({ q: query.trim(), letter, sort: roster.sortOrder, cols: roster.columns });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [query, letter, roster.sortOrder, roster.columns]);

  // 필터가 하나라도 걸려 있으면 초기화 버튼을 보여줍니다.
  const filtersActive = query.trim() !== "" || letter !== "all" || roster.sortOrder !== "default";
  const resetFilters = () => {
    setQuery("");
    setOpen(false);
    setLetter("all");
    props.onSort("default");
  };

  // 랜덤을 고를 때마다 새 순서로 섞습니다.
  useEffect(() => {
    if (roster.sortOrder === "random" && prevSort.current !== "random") {
      setSeed(Math.floor(Math.random() * 1_000_000));
    }
    prevSort.current = roster.sortOrder;
  }, [roster.sortOrder]);

  // 툴바가 화면 위에 붙으면 그림자를 켭니다.
  useEffect(() => {
    const onScroll = () => {
      const el = toolbarRef.current;
      if (el) setStuck(el.getBoundingClientRect().top <= 0.5);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // 검색어/첫 글자/정렬이 바뀌면 잠깐 뒤에 카드 모션을 다시 재생합니다.
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const timer = window.setTimeout(() => setMotionTick(value => value + 1), 160);
    return () => window.clearTimeout(timer);
  }, [query, letter, roster.sortOrder]);

  const suggestions = query.trim() ? filtered.slice(0, 7) : [];
  const isEmpty = filtered.length === 0 && (query.length > 0 || roster.sortOrder === "favorites");

  // 검색창 키보드 조작 (↑↓ 이동, Enter 선택, Esc 닫기)
  const onSearchKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return; // 한글 조합 중에는 무시
    if (event.key === "Escape") return setOpen(false);
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(i => (i + 1) % suggestions.length);
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(i => (i <= 0 || i >= suggestions.length ? suggestions.length - 1 : i - 1));
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      setQuery(displayName(suggestions[Math.max(0, activeIndex)]));
      setOpen(false);
    }
  };

  const search = (value: string) => {
    setQuery(value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const hasCustomRosterLayer =
    design.rosterBgMode === "gradient" || (design.rosterBgMode === "image" && Boolean(design.rosterBgImage));

  return (
    <main
      id="roster"
      className={`roster-section ${hasCustomRosterLayer ? "has-custom-bg" : ""}`}
      style={{ backgroundColor: design.rosterBg }}
    >
      <div className="section-inner">
        {/* 인쇄(PDF)에서만 보이는 머리말 */}
        <div className="print-head">
          <strong>RING ROSTER</strong>
          <span>
            전체 {roster.wrestlers.length}명 · {new Date().toLocaleDateString("ko-KR")}
          </span>
        </div>
        {/* 화면 낭독기용 결과 알림 */}
        <p className="sr-only" aria-live="polite">
          {ready ? `${filtered.length}명 표시 중` : "로스터를 불러오는 중"}
        </p>

        {/* 섹션 제목 */}
        <div className="section-heading">
          <div>
            <div className="overline">
              <span /> THE ROSTER
            </div>
            <h2>
              {design.rosterTitle}
              <span>.</span>
            </h2>
            <p>{design.rosterSubtitle}</p>
          </div>
        </div>

        {/* 정렬 / 검색 / 열 수 조절 */}
        <div ref={toolbarRef} className={`roster-toolbar ${stuck ? "is-stuck" : ""}`} style={{ backgroundColor: design.rosterBg }}>
          <div className="toolbar-left">
            <span className="tab-active">ALL SUPERSTARS</span>
            <span className="count">{roster.wrestlers.length.toString().padStart(2, "0")}</span>
            <label className="sort-control">
              <span>정렬</span>
              <select value={roster.sortOrder} onChange={event => props.onSort(event.target.value as SortOrder)} aria-label="로스터 정렬">
                <option value="default">기본순</option>
                <option value="newest">최신 등록순</option>
                <option value="oldest">오래된 등록순</option>
                <option value="asc">A-Z</option>
                <option value="desc">Z-A</option>
                <option value="favorites">찜한 선수</option>
                <option value="random">랜덤</option>
              </select>
              {roster.sortOrder === "random" && (
                <button type="button" className="sort-reshuffle" onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))} aria-label="랜덤 순서 다시 섞기">
                  <RotateCw size={13} />
                  <span>다시 섞기</span>
                </button>
              )}
            </label>
          </div>

          <div className="toolbar-right">
            <div className="search-wrap" onBlur={() => window.setTimeout(() => setOpen(false), 120)}>
              <div className="search-box">
                <Search size={16} />
                <input
                  value={query}
                  onChange={event => search(event.target.value)}
                  onFocus={() => search(query)}
                  onKeyDown={onSearchKey}
                  placeholder="선수 검색"
                  aria-label="선수 검색"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={open && suggestions.length > 0}
                  aria-controls="search-suggestions"
                  aria-activedescendant={open && activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                />
                {query && (
                  <button onMouseDown={event => event.preventDefault()} onClick={() => { setQuery(""); setOpen(false); }} aria-label="검색어 지우기">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* 자동완성 목록 */}
              {open && suggestions.length > 0 && (
                <div id="search-suggestions" role="listbox" className="search-suggestions">
                  {suggestions.map((item, index) => (
                    <button
                      key={item.id}
                      id={`suggestion-${index}`}
                      role="option"
                      aria-selected={activeIndex === index}
                      className={activeIndex === index ? "selected" : ""}
                      onMouseDown={event => event.preventDefault()}
                      onClick={() => { setQuery(displayName(item)); setOpen(false); }}
                    >
                      {item.image ? (
                        <img src={item.image} alt="" />
                      ) : (
                        <span className="suggestion-placeholder">
                          <ImagePlus size={14} />
                        </span>
                      )}
                      <span>{displayName(item)}</span>
                      <Search size={13} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {filtersActive && (
              <button type="button" className="filter-reset" onClick={resetFilters}>
                <RotateCw size={13} />
                <span>초기화</span>
              </button>
            )}

            {/* 열 수 조절 (3 ~ 9) */}
            <div className="columns-control" aria-label="한 줄에 표시할 선수 수">
              <Grid2X2 size={15} />
              <span>열</span>
              <button onClick={() => props.onColumns(-1)} disabled={!editable || roster.columns <= 3} aria-label="열 줄이기">
                <Minus size={14} />
              </button>
              <strong>{roster.columns}</strong>
              <button onClick={() => props.onColumns(1)} disabled={!editable || roster.columns >= 9} aria-label="열 늘리기">
                <Plus size={14} />
              </button>
              <ChevronDown className="columns-chevron" size={13} />
            </div>
          </div>

          {/* 이름 첫 글자 필터 (알파벳 · 숫자) */}
          <div className="alpha-filter" role="group" aria-label="이름 첫 글자로 보기">
            <span className="alpha-label">이름</span>
            {letterKeys.map(key => (
              <button
                key={key}
                type="button"
                className={`alpha-chip ${letter === key ? "is-active" : ""}`}
                aria-pressed={letter === key}
                disabled={key !== "all" && !letterCounts[key]}
                onClick={() => setLetter(key)}
              >
                {key === "all" ? "전체" : key}
              </button>
            ))}
          </div>
        </div>

        {/* 안내 문구 */}
        <div className="roster-note">
          <span>{manageMode ? "카드를 선택해 사진, 이름, 링크를 편집하세요." : "사진이나 이름을 누르면 설정한 프로필 링크로 이동합니다."}</span>
          <span className="desktop-note">
            기본 {roster.columns}열 {visibleColumns !== roster.columns ? ` · 현재 화면 ${visibleColumns}열` : ""}
          </span>
        </div>

        {storageError && (
          <p className="storage-error" role="alert">
            브라우저에 저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.
          </p>
        )}

        {!ready ? (
          <div className="empty-state">{loadFailed ? "저장된 로스터를 불러오지 못했습니다. 브라우저 설정을 확인하고 새로고침해 주세요." : "로스터를 불러오는 중입니다."}</div>
        ) : isEmpty ? (
          <div className="empty-state">
            <Heart size={25} />
            <strong>{roster.sortOrder === "favorites" ? "찜한 선수가 없습니다" : "검색 결과가 없습니다"}</strong>
            <span>
              {roster.sortOrder === "favorites"
                ? "선수 카드의 하트 버튼을 눌러 찜해 보세요."
                : letter !== "all"
                  ? "이 글자로 시작하는 선수가 없습니다. 다른 글자를 골라 보세요."
                  : "다른 이름으로 검색해 보세요."}
            </span>
          </div>
        ) : (
          <div
            key={motionTick}
            className={`roster-grid ${revealOn ? "reveal-on" : ""} ${motionTick > 0 ? "motion" : ""}`}
            style={{ gridTemplateColumns: `repeat(${visibleColumns}, minmax(0, 1fr))` }}
          >
            {filtered.map((wrestler, index) => (
              <Card
                key={wrestler.id}
                wrestler={wrestler}
                index={index}
                manageMode={manageMode}
                editable={editable}
                onEdit={props.onEdit}
                onInfo={props.onInfo}
                onToggleFavorite={props.onToggleFavorite}
                onPickLinks={openPicker}
                revealRef={revealRef}
                revealDelay={(index % Math.max(1, visibleColumns)) * 35}
                animate={motionTick > 0}
                order={index % Math.max(1, visibleColumns)}
              />
            ))}
            {!query && letter === "all" && (
              <button className="add-card" disabled={!editable} onClick={props.onAdd}>
                <span>
                  <Plus size={22} />
                </span>
                <strong>선수 추가하기</strong>
                <small>새로운 프로필을 등록하세요</small>
              </button>
            )}
          </div>
        )}

        <div className="under-grid">
          <span>
            <i /> {roster.wrestlers.length} SUPERSTARS
          </span>
          <p>변경 내용은 이 브라우저에 저장됩니다.</p>
        </div>
      </div>

      {/* 링크 선택 팝업 */}
      {picker && (
        <>
          <div className="link-pop-backdrop" onMouseDown={() => setPicker(null)} />
          <div className="link-pop" style={{ top: picker.top, left: picker.left }} role="menu" aria-label={`${displayName(picker.wrestler)} 링크 선택`}>
            <p className="link-pop-title">{displayName(picker.wrestler)}</p>
            {wrestlerLinks(picker.wrestler).map(link => (
              <a key={link} role="menuitem" href={link} target="_blank" rel="noopener noreferrer" onClick={() => setPicker(null)}>
                <span>{linkLabel(link)}</span>
                <em>{hostOf(link)}</em>
              </a>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
