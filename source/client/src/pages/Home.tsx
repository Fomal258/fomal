import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUp } from "lucide-react";
import DesignEditor from "@/components/DesignEditor";
import Hero from "@/components/Hero";
import ProfileEditor from "@/components/ProfileEditor";
import ProfileInfoModal from "@/components/ProfileInfoModal";
import RosterSection from "@/components/RosterSection";
import SiteHeader from "@/components/SiteHeader";
import SiteHubModal from "@/components/SiteHubModal";
import GhSyncModal from "@/components/GhSyncModal";
import { defaultWrestlers, ROSTER_VERSION } from "@/data/roster";
import { defaultSiteCategories, defaultSites, type SiteCategoryItem, type SiteItem } from "@/data/sites";
import { defaultDesign, normalizeDesign, type SiteDesign } from "@/lib/design";
import { displayName, loadRoster, saveRoster, uploadRosterImage, wrestlerNames, type RosterState, type Wrestler } from "@/lib/storage";
import { downloadBackup, fetchRemote, isConfigured, loadGhConfig, pushRemote, saveGhConfig, sigOf, type GhConfig } from "@/lib/githubSync";


// 이전에 저장된 로컬 상태에서 유망주 이름을 모읍니다(마이그레이션용, 동기 접근).
const localProspectCache: { names: string[] } = { names: [] };
function awaitLocalProspects(): string[] {
  return localProspectCache.names;
}

// 처음 화면에 보여줄 기본 상태 (명단 129명 + 기본 디자인 + 기본 외부 사이트/카테고리)
const initialState: RosterState = {
  wrestlers: defaultWrestlers,
  columns: 7,
  sortOrder: "default",
  design: defaultDesign,
  sites: defaultSites,
  siteCategories: defaultSiteCategories,
  sourceVersion: ROSTER_VERSION,
};

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
  const [roster, setRoster] = useState<RosterState>(initialState);
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
  const [ghConfig, setGhConfig] = useState<GhConfig>(() => loadGhConfig());
  const [ghOpen, setGhOpen] = useState(false);
  const [ghStatus, setGhStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");
  const skipPush = useRef(true); // 원격에서 받아온 직후의 저장은 건너뜀
  const syncTimer = useRef<number | null>(null);

  const firstSave = useRef(true); // 불러오기 직후의 저장은 건너뜀
  const visibleColumns = useResponsiveColumns(roster.columns);
  const design = ensureSiteNav(normalizeDesign(roster.design));
  const sites = Array.isArray(roster.sites) && (roster.sites as SiteItem[]).length > 0 ? (roster.sites as SiteItem[]) : defaultSites;
  const siteCategories =
    Array.isArray(roster.siteCategories) && (roster.siteCategories as SiteCategoryItem[]).length > 0
      ? (roster.siteCategories as SiteCategoryItem[])
      : defaultSiteCategories;
  const editable = ready;

  // ── 불러오기: 원격(roster-data.json) → 로컬 순서로 채택 ──────────
  useEffect(() => {
    let cancelled = false;

    const apply = (saved: RosterState) => {
      // roster-data.json(또는 저장된 상태)이 있으면 그 명단을 그대로 신뢰합니다.
      const wrestlers = saved.wrestlers.length
        ? saved.wrestlers.map(w => ({ ...w, names: wrestlerNames(w) }))
        : defaultWrestlers;

      // ── 유망주 유지: ①이전 레이어(localStorage) ②기존 로컬 저장분 을 합칩니다.
      const prospectNames = new Set<string>();
      try {
        const legacy = JSON.parse(localStorage.getItem("ringRosterProspects") || "[]");
        if (Array.isArray(legacy)) legacy.forEach((n: string) => n && prospectNames.add(n.trim()));
      } catch {}
      try {
        const prev = awaitLocalProspects();
        prev.forEach(n => prospectNames.add(n));
      } catch {}
      if (prospectNames.size) {
        wrestlers.forEach((w: Wrestler) => {
          if (wrestlerNames(w).some(n => prospectNames.has(n.trim()))) w.prospect = true;
        });
        try { localStorage.removeItem("ringRosterProspects"); } catch {}
      }
      setRoster({
        wrestlers,
        columns: Math.max(3, Math.min(9, saved.columns || 7)),
        sortOrder: saved.sortOrder ?? "default",
        design: ensureSiteNav(normalizeDesign(saved.design ?? defaultDesign)),
        sites: Array.isArray(saved.sites) && saved.sites.length > 0 ? saved.sites : defaultSites,
        siteCategories:
          Array.isArray(saved.siteCategories) && saved.siteCategories.length > 0 ? saved.siteCategories : defaultSiteCategories,
        sourceVersion: ROSTER_VERSION,
      });
    };

    (async () => {
      const cfg = loadGhConfig();
      const [remote, local] = await Promise.all([
        fetchRemote(cfg).catch(() => null),
        loadRoster().catch(() => null),
      ]);
      // 로컬에 남아 있는 유망주 목록을 캐시 (원격에 없더라도 유지)
      localProspectCache.names = (local?.wrestlers || [])
        .filter((w: Wrestler) => w.prospect)
        .flatMap((w: Wrestler) => wrestlerNames(w));
      if (cancelled) return;

      const remoteSig = remote && Array.isArray(remote.wrestlers) ? sigOf(remote) : "";
      const savedSig = (() => { try { return localStorage.getItem("ring-roster-remote-sig") || ""; } catch { return ""; } })();
      const remoteChanged = Boolean(remoteSig) && remoteSig !== savedSig;

      if (remote && (!local || remoteChanged)) {
        try { localStorage.setItem("ring-roster-remote-sig", remoteSig); } catch {}
        skipPush.current = true;
        apply(remote as RosterState);
      } else if (local) {
        apply(local);
      } else if (remote) {
        apply(remote as RosterState);
      }
      setReady(true);
    })().catch(() => {
      if (!cancelled) { setLoadFailed(true); setReady(true); }
    });

    return () => { cancelled = true; };
  }, []);

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

  // ── 깃허브 자동 저장 (변경 감지 후 1초 뒤 커밋) ────────────────
  useEffect(() => {
    if (!ready) return;
    if (!isConfigured(ghConfig) || ghConfig.autoSync === false) return;
    if (skipPush.current) { skipPush.current = false; return; }
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    setGhStatus("syncing");
    syncTimer.current = window.setTimeout(() => {
      pushRemote(ghConfig, roster, `Auto-sync roster (${roster.wrestlers.length} superstars)`)
        .then(() => {
          setGhStatus("synced");
          try { localStorage.setItem("ring-roster-remote-sig", sigOf(roster)); } catch {}
        })
        .catch(() => setGhStatus("error"));
    }, 1000);
  }, [roster, ready, ghConfig]);

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
  const toggleProspect = (id: string) =>
    setRoster(prev => ({ ...prev, wrestlers: prev.wrestlers.map(w => (w.id === id ? { ...w, prospect: !w.prospect } : w)) }));

  const saveGh = (next: GhConfig) => { setGhConfig(next); saveGhConfig(next); };
  const syncNow = async (next: GhConfig) => {
    await pushRemote(next, roster, "Sync roster-data.json from site");
    setGhStatus("synced");
    try { localStorage.setItem("ring-roster-remote-sig", sigOf(roster)); } catch {}
  };
  const backup = () => downloadBackup(roster);

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
          onOpenGh={() => setGhOpen(true)}
          onBackup={backup}
          ghStatus={ghStatus}
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
        onToggleProspect={toggleProspect}
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
      {ghOpen && (
        <GhSyncModal
          config={ghConfig}
          onSave={saveGh}
          onSyncNow={syncNow}
          onClose={() => setGhOpen(false)}
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
