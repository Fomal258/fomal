import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUp } from "lucide-react";
import DesignEditor from "@/components/DesignEditor";
import Hero from "@/components/Hero";
import ProfileEditor from "@/components/ProfileEditor";
import ProfileInfoModal from "@/components/ProfileInfoModal";
import RosterSection from "@/components/RosterSection";
import SiteHeader from "@/components/SiteHeader";
import SiteHubModal from "@/components/SiteHubModal";
import { defaultWrestlers, ROSTER_VERSION } from "@/data/roster";
import { defaultSiteCategories, defaultSites, type SiteCategoryItem, type SiteItem } from "@/data/sites";
import { defaultDesign, normalizeDesign, type SiteDesign } from "@/lib/design";
import { displayName, loadRoster, saveRoster, uploadRosterImage, wrestlerNames, type RosterState, type Wrestler } from "@/lib/storage";
import { profileSlug, readRosterUrl, wrestlerBySlug, writeRosterUrl } from "@/lib/urlState";

// 처음 화면에 보여줄 기본 상태 (명단 + 기본 디자인 + 기본 외부 사이트/카테고리).
// 주소에 sort/cols 가 있으면 그 값으로 시작해 공유한 화면과 같은 상태로 열립니다.
function makeInitialState(): RosterState {
  const fromUrl = readRosterUrl();
  return {
    wrestlers: defaultWrestlers,
    columns: fromUrl.cols ?? 7,
    sortOrder: fromUrl.sort ?? "default",
    design: defaultDesign,
    sites: defaultSites,
    siteCategories: defaultSiteCategories,
    sourceVersion: ROSTER_VERSION,
  };
}

// 저장된 메뉴에 SITE가 없으면 자동으로 추가해 줍니다.
function ensureSiteNav(design: SiteDesign): SiteDesign {
  const hasSite = design.navItems.some(item => item.label.trim().toUpperCase() === "SITE" || item.url === "#site");
  if (hasSite) return design;
  return {
    ...design,
    navItems: [...design.navItems, { id: "site", label: "SITE", url: "#site" }],
  };
}

// 화면 폭에 맞춰 실제로 그릴 열 수를 계산합니다 (모바일 2열 ~ 큰 화면 9열).
function useResponsiveColumns(columns: number) {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const maxByWidth = width < 540 ? 2 : width < 760 ? 3 : width < 1024 ? 4 : width < 1200 ? 5 : 9;
  return Math.min(columns, maxByWidth);
}

export default function Home() {
  // ── 화면 상태 ────────────────────────────────────────────────
  const [roster, setRoster] = useState<RosterState>(makeInitialState);
  const [ready, setReady] = useState(false); // 저장된 로스터를 다 읽었는지
  const [loadFailed, setLoadFailed] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [manageMode, setManageMode] = useState(false); // 카드 클릭 = 편집
  const [editing, setEditing] = useState<Wrestler | "new" | null>(null); // 수정/추가 팝업
  const [info, setInfo] = useState<Wrestler | null>(null); // 정보 팝업
  const [designOpen, setDesignOpen] = useState(false);
  const [siteHubOpen, setSiteHubOpen] = useState(false);
  const [siteEditTarget, setSiteEditTarget] = useState<SiteItem | "new" | null>(null);
  const [siteInitialCat, setSiteInitialCat] = useState<string>("ALL");
  const [showTop, setShowTop] = useState(false); // 맨 위로 버튼

  const firstSave = useRef(true); // 불러오기 직후의 저장은 건너뜀
  const visibleColumns = useResponsiveColumns(roster.columns);
  const design = ensureSiteNav(normalizeDesign(roster.design));
  const sites = Array.isArray(roster.sites) && (roster.sites as SiteItem[]).length > 0 ? (roster.sites as SiteItem[]) : defaultSites;
  const siteCategories =
    Array.isArray(roster.siteCategories) && (roster.siteCategories as SiteCategoryItem[]).length > 0
      ? (roster.siteCategories as SiteCategoryItem[])
      : defaultSiteCategories;
  const editable = ready;

  // ── 불러오기 ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadRoster()
      .then(saved => {
        if (cancelled || !saved) return;
        const outdated = saved.sourceVersion !== ROSTER_VERSION;
        const favorites = new Map(saved.wrestlers.map(w => [w.id, Boolean(w.favorite)]));
        const wrestlers = outdated
          ? defaultWrestlers.map(w => ({ ...w, favorite: favorites.get(w.id) ?? false }))
          : saved.wrestlers.map(w => ({ ...w, names: wrestlerNames(w) }));
        setRoster({
          wrestlers,
          columns: Math.max(3, Math.min(9, saved.columns || 7)),
          sortOrder: saved.sortOrder ?? "default",
          design: ensureSiteNav(normalizeDesign(saved.design ?? defaultDesign)),
          sites: Array.isArray(saved.sites) && saved.sites.length > 0 ? saved.sites : defaultSites,
          siteCategories:
            Array.isArray(saved.siteCategories) && saved.siteCategories.length > 0
              ? saved.siteCategories
              : defaultSiteCategories,
          sourceVersion: ROSTER_VERSION,
        });
      })
      .catch(() => !cancelled && setLoadFailed(true))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // ── 주소(딥링크) ↔ 프로필 팝업 ───────────────────────────────
  // ?p=선수이름 으로 들어오면 그 선수 정보를 바로 열고, 팝업을 닫으면 주소에서 지웁니다.
  const openedFromUrl = useRef(false);
  useEffect(() => {
    if (!ready || openedFromUrl.current) return;
    openedFromUrl.current = true;
    const slug = readRosterUrl().profile;
    if (!slug) return;
    const found = wrestlerBySlug(roster.wrestlers, slug);
    if (found) setInfo(found);
  }, [ready, roster.wrestlers]);

  useEffect(() => {
    if (!ready) return;
    writeRosterUrl({ p: info ? profileSlug(info) : null });
  }, [info, ready]);

  // 브라우저 뒤로/앞으로 가기로도 팝업이 따라 움직입니다.
  useEffect(() => {
    const onPopState = () => {
      const slug = readRosterUrl().profile;
      setInfo(slug ? wrestlerBySlug(roster.wrestlers, slug) : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [roster.wrestlers]);

  // ── 저장하기 (상태가 바뀔 때마다) ────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    saveRoster(roster)
      .then(() => setStorageError(false))
      .catch(() => setStorageError(true));
  }, [roster, ready]);

  // 스크롤이 내려가면 "맨 위로" 버튼 표시
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ── 편집 동작 ───────────────────────────────────────────────
  const changeColumns = (delta: number) => setRoster(prev => ({ ...prev, columns: Math.max(3, Math.min(9, prev.columns + delta)) }));
  const changeSort = (sortOrder: RosterState["sortOrder"]) => setRoster(prev => ({ ...prev, sortOrder }));
  const toggleFavorite = (id: string) =>
    setRoster(prev => ({ ...prev, wrestlers: prev.wrestlers.map(w => (w.id === id ? { ...w, favorite: !w.favorite } : w)) }));

  // 선수 추가/수정 저장
  const saveProfile = async (data: { names: string[]; image: string; imageCrop: { x: number; y: number; zoom: number }; bio: string; links: string[] }) => {
    const image = data.image.startsWith("data:image/") ? await uploadRosterImage(data.image) : data.image;
    if (editing === "new") {
      const id = `wrestler-${Date.now()}`;
      setRoster(prev => ({ ...prev, wrestlers: [...prev.wrestlers, { id, ...data, image, url: undefined, createdAt: Date.now() }] }));
    } else if (editing) {
      setRoster(prev => ({ ...prev, wrestlers: prev.wrestlers.map(w => (w.id === editing.id ? { ...w, ...data, image, url: undefined } : w)) }));
    }
    setEditing(null);
  };

  // 선수 삭제
  const deleteProfile = () => {
    if (!editing || editing === "new") return;
    if (!window.confirm(`'${displayName(editing)}' 선수를 삭제할까요?`)) return;
    setRoster(prev => ({ ...prev, wrestlers: prev.wrestlers.filter(w => w.id !== editing.id) }));
    setEditing(null);
  };

  // 디자인 저장
  const saveDesign = (next: SiteDesign) => {
    setRoster(prev => ({ ...prev, design: next }));
    setDesignOpen(false);
  };

  // 외부 사이트 및 카테고리 목록 저장
  const saveSites = (nextSites: SiteItem[]) => {
    setRoster(prev => ({ ...prev, sites: nextSites }));
  };
  const saveSiteCategories = (nextCategories: SiteCategoryItem[]) => {
    setRoster(prev => ({ ...prev, siteCategories: nextCategories }));
  };

  // 디자인 색/글자 크기를 CSS 변수로 넘겨 전체 스타일에 적용
  const cssVars = {
    "--brand-accent": design.accent,
    "--profile-highlight": design.profileHighlight,
    "--profile-modal-bg": design.profileModalBg,
    "--profile-modal-layer":
      design.profileModalBgMode === "gradient"
        ? `linear-gradient(${design.profileModalGradientAngle}deg, ${design.profileModalGradientFrom}, ${design.profileModalGradientTo})`
        : design.profileModalBgMode === "image" && design.profileModalBgImage
          ? `url("${design.profileModalBgImage}")`
          : "none",
    "--profile-modal-border": design.profileModalBorder,
    "--profile-modal-border-width": `${design.profileModalBorderWidth}px`,
    "--profile-modal-overlay": `${design.profileModalOverlay / 100}`,
    "--profile-modal-header-bg": design.profileModalHeaderBg,
    "--profile-modal-text": design.profileModalText,
    "--profile-modal-accent": design.profileModalAccent,
    "--profile-modal-field-bg": design.profileModalFieldBg,
    "--header-text": design.headerText,
    "--hero-text": design.heroText,
    "--roster-text": design.rosterText,
    "--roster-bg-layer":
      design.rosterBgMode === "gradient"
        ? `linear-gradient(${design.rosterGradientAngle}deg, ${design.rosterGradientFrom}, ${design.rosterGradientTo})`
        : design.rosterBgMode === "image" && design.rosterBgImage
          ? `url("${design.rosterBgImage}")`
          : "none",
    "--roster-overlay": `${(design.rosterOverlay ?? 0) / 100}`,
    "--font-scale": `${design.fontScale / 100}`,
  } as CSSProperties;

  return (
    <div id="top" className="site-shell" style={cssVars}>
      <a className="skip-link" href="#roster">
        본문으로 건너뛰기
      </a>
      {design.showHeader && (
        <SiteHeader
          design={design}
          sites={sites}
          categories={siteCategories}
          wrestlers={roster.wrestlers}
          manageMode={manageMode}
          editable={editable}
          onToggleManage={() => setManageMode(v => !v)}
          onOpenDesign={() => setDesignOpen(true)}
          onAddWrestler={() => setEditing("new")}
          onOpenSiteHub={opts => {
            setSiteEditTarget(opts?.editTarget ?? null);
            setSiteInitialCat(opts?.category ?? "ALL");
            setSiteHubOpen(true);
          }}
        />
      )}

      {design.showHero && <Hero design={design} wrestlers={roster.wrestlers} />}

      <RosterSection
        design={design}
        roster={roster}
        visibleColumns={visibleColumns}
        ready={ready}
        loadFailed={loadFailed}
        storageError={storageError}
        manageMode={manageMode}
        editable={editable}
        onSort={changeSort}
        onColumns={changeColumns}
        onToggleFavorite={toggleFavorite}
        onEdit={setEditing}
        onAdd={() => setEditing("new")}
        onInfo={setInfo}
      />

      {showTop && (
        <button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="맨 위로 이동">
          <ArrowUp size={18} />
        </button>
      )}

      {editing && (
        <ProfileEditor
          wrestler={editing === "new" ? null : editing}
          design={design}
          onSave={saveProfile}
          onClose={() => setEditing(null)}
          onDelete={editing === "new" ? undefined : deleteProfile}
        />
      )}
      {info && (
        <ProfileInfoModal
          wrestler={info}
          animation={design.profileModalAnimation}
          duration={design.profileModalDuration}
          onClose={() => setInfo(null)}
          onEdit={() => {
            setEditing(info);
            setInfo(null);
          }}
        />
      )}
      {designOpen && <DesignEditor design={design} onSave={saveDesign} onClose={() => setDesignOpen(false)} />}
      {siteHubOpen && (
        <SiteHubModal
          sites={sites}
          categories={siteCategories}
          wrestlers={roster.wrestlers}
          initialCategory={siteInitialCat}
          initialEditSite={siteEditTarget}
          onSaveSites={saveSites}
          onSaveCategories={saveSiteCategories}
          onClose={() => {
            setSiteHubOpen(false);
            setSiteEditTarget(null);
            setSiteInitialCat("ALL");
          }}
        />
      )}
    </div>
  );
}
