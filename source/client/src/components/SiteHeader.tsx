import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe, Pencil, Plus, Settings2 } from "lucide-react";
import type { SiteDesign } from "@/lib/design";
import { siteDomain, type SiteCategoryItem, type SiteItem } from "@/data/sites";
import { countLinkedWrestlers } from "@/components/SiteHubModal";
import type { Wrestler } from "@/lib/storage";

type Props = {
  design: SiteDesign;
  sites: SiteItem[];
  categories: SiteCategoryItem[];
  wrestlers: Wrestler[];
  manageMode: boolean; // 편집 모드인지
  editable: boolean; // 편집 버튼을 누를 수 있는지(로스터를 불러온 뒤)
  onToggleManage: () => void;
  onOpenDesign: () => void;
  onAddWrestler: () => void;
  onOpenSiteHub: (options?: { editTarget?: SiteItem | "new" | null; category?: string }) => void;
  onOpenGh?: () => void;
  onBackup?: () => void;
  ghStatus?: "idle" | "syncing" | "synced" | "error";
};

type PillBox = { left: number; width: number; opacity: number };

// 상단 헤더: 로고 + 마우스를 따라 부드럽게 이동하는 슬라이딩 배경 메뉴 + 부드러운 서브메뉴 모션 + 편집 버튼들
export default function SiteHeader({
  design,
  sites,
  categories,
  wrestlers,
  manageMode,
  editable,
  onToggleManage,
  onOpenDesign,
  onAddWrestler,
  onOpenSiteHub,
  onOpenGh,
  onBackup,
  ghStatus = "idle",
}: Props) {
  const [siteMenuOpen, setSiteMenuOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // 메인 내비게이션 슬라이딩 배경 상태
  const navRef = useRef<HTMLElement>(null);
  const [navPill, setNavPill] = useState<PillBox>({ left: 0, width: 0, opacity: 0 });
  const [navHovering, setNavHovering] = useState(false);

  // 우측 컨트롤 버튼 슬라이딩 배경 상태
  const ctrlRef = useRef<HTMLDivElement>(null);
  const [ctrlPill, setCtrlPill] = useState<PillBox>({ left: 0, width: 0, opacity: 0 });

  const moveNavPill = (el: HTMLElement | null) => {
    const parent = navRef.current;
    if (!parent || !el) return;
    const pRect = parent.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    setNavPill({ left: eRect.left - pRect.left, width: eRect.width, opacity: 1 });
  };

  const resetNavPill = () => {
    setNavHovering(false);
    const parent = navRef.current;
    if (!parent) return setNavPill(p => ({ ...p, opacity: 0 }));
    const activeEl = parent.querySelector<HTMLElement>(".is-current-item");
    if (activeEl) {
      moveNavPill(activeEl);
    } else {
      setNavPill(p => ({ ...p, opacity: 0 }));
    }
  };

  const moveCtrlPill = (el: HTMLElement | null) => {
    const parent = ctrlRef.current;
    if (!parent || !el) return;
    const pRect = parent.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    setCtrlPill({ left: eRect.left - pRect.left, width: eRect.width, opacity: 1 });
  };

  const resetCtrlPill = () => {
    setCtrlPill(p => ({ ...p, opacity: 0 }));
  };

  // 처음 렌더링 및 메뉴가 바뀔 때 활성 메뉴 위치로 슬라이딩 배경 맞춤
  useEffect(() => {
    const timer = window.setTimeout(resetNavPill, 40);
    window.addEventListener("resize", resetNavPill);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", resetNavPill);
    };
  }, [design.navItems, siteMenuOpen, sites.length]);

  const openDropdown = (targetEl?: HTMLElement | null) => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setSiteMenuOpen(true);
    setNavHovering(true);
    if (targetEl) moveNavPill(targetEl);
  };
  const scheduleClose = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      setSiteMenuOpen(false);
    }, 180);
  };

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setSiteMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // 드롭다운에 보여줄 추천/즐겨찾기 사이트 (최대 6개)
  const quickSites = sites.filter(s => s.favorite).concat(sites.filter(s => !s.favorite)).slice(0, 6);

  return (
    <header className="site-header" style={{ backgroundColor: design.headerBg }}>
      <div className="header-inner">
        {/* 로고 (동그라미 3개 + 두 줄 텍스트) */}
        {design.showBrand && (
          <a className="brand" href="#top" aria-label={`${design.brandTop} ${design.brandBottom} 홈`}>
            <span className="brand-mark">
              <i />
              <i />
              <i />
            </span>
            <span className="brand-type">
              <b>{design.brandTop}</b>
              <small>{design.brandBottom}</small>
            </span>
          </a>
        )}

        {/* 주 메뉴: 마우스를 따라 자연스럽게 글로우 캡슐과 하단 네온 바가 미끄러지듯 이동합니다 */}
        <nav
          ref={navRef}
          className={`main-nav ${navHovering ? "is-hovering" : ""}`}
          aria-label="주 메뉴"
          onMouseEnter={() => setNavHovering(true)}
          onMouseLeave={resetNavPill}
        >
          <span
            className={`nav-hover-bg ${navHovering ? "is-tracking" : ""}`}
            aria-hidden="true"
            style={{
              transform: `translate3d(${navPill.left}px, 0, 0)`,
              width: `${navPill.width}px`,
              opacity: navPill.opacity,
            }}
          >
            <i className="nav-hover-glow" />
            <b className="nav-hover-bar" />
          </span>

          {design.navItems.map(item => {
            const isSiteNav = item.label.trim().toUpperCase() === "SITE" || item.url === "#site";
            if (isSiteNav) {
              return (
                <div
                  key={item.id}
                  ref={wrapRef}
                  className={`nav-site-wrap ${siteMenuOpen ? "is-current-item" : ""}`}
                  onMouseEnter={e => openDropdown(e.currentTarget)}
                  onMouseLeave={scheduleClose}
                >
                  <button
                    type="button"
                    className={`nav-item-link nav-site-trigger ${siteMenuOpen ? "active" : ""}`}
                    aria-expanded={siteMenuOpen}
                    onFocus={e => moveNavPill(e.currentTarget.parentElement)}
                    onClick={() => {
                      setSiteMenuOpen(false);
                      onOpenSiteHub({ editTarget: null, category: "ALL" });
                    }}
                  >
                    <span className="nav-item-text">{item.label}</span>
                    <span className="nav-site-count">{sites.length}</span>
                    <ChevronDown size={13} className={siteMenuOpen ? "is-open" : ""} />
                  </button>

                  {/* 서브메뉴(메가 드롭다운): 열릴 때와 닫힐 때 모두 부드러운 스프링 입체 모션 적용 */}
                  <div
                    className={`site-mega-dropdown ${siteMenuOpen ? "is-open" : ""}`}
                    role="region"
                    aria-label="사이트 빠른 이동 메뉴"
                    aria-hidden={!siteMenuOpen}
                  >
                    <div className="site-mega-inner">
                      <div className="site-mega-head">
                        <div>
                          <strong>QUICK SITE LAUNCHER</strong>
                          <span>자주 찾는 외부 사이트 바로가기 · 클릭 시 새 탭 이동</span>
                        </div>
                        <div className="site-mega-head-btns">
                          <button
                            type="button"
                            className="site-mega-add"
                            tabIndex={siteMenuOpen ? 0 : -1}
                            onClick={() => {
                              setSiteMenuOpen(false);
                              onOpenSiteHub({ editTarget: "new" });
                            }}
                          >
                            <Plus size={12} /> 사이트 추가
                          </button>
                          <button
                            type="button"
                            className="site-mega-all"
                            tabIndex={siteMenuOpen ? 0 : -1}
                            onClick={() => {
                              setSiteMenuOpen(false);
                              onOpenSiteHub({ editTarget: null, category: "ALL" });
                            }}
                          >
                            전체 허브 열기 ({sites.length}) ↗
                          </button>
                        </div>
                      </div>

                      <div className={`site-mega-grid count-${Math.min(3, Math.max(1, quickSites.length))}`}>
                        {quickSites.map((site, sIdx) => {
                          const linked = countLinkedWrestlers(site, wrestlers);
                          const catLabel = categories.find(c => c.key === site.category)?.label.split("·")[0]?.trim() || site.category;
                          return (
                            <a
                              key={site.id}
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="site-mega-card"
                              style={{ "--item-idx": sIdx } as React.CSSProperties}
                              tabIndex={siteMenuOpen ? 0 : -1}
                              onClick={() => setSiteMenuOpen(false)}
                              title={`${site.title} (${site.url})`}
                            >
                              <div className="site-mega-card-top">
                                <span className="site-mega-badge">{site.badge || catLabel}</span>
                                {linked > 0 && <em className="site-mega-roster">연동 {linked}명</em>}
                                <small className="site-mega-domain">{siteDomain(site.url)}</small>
                              </div>
                              <div className="site-mega-card-title">
                                <span className="site-mega-title-text">{site.title}</span>
                                <i className="site-mega-arrow">↗</i>
                              </div>
                              <p className="site-mega-desc">{site.description}</p>
                            </a>
                          );
                        })}
                      </div>

                      <div className="site-mega-foot">
                        <div className="site-mega-cats">
                          {categories.map(c => (
                            <button
                              key={c.key}
                              type="button"
                              tabIndex={siteMenuOpen ? 0 : -1}
                              onClick={() => {
                                setSiteMenuOpen(false);
                                onOpenSiteHub({ editTarget: null, category: c.key });
                              }}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="site-mega-manage"
                          tabIndex={siteMenuOpen ? 0 : -1}
                          onClick={() => {
                            setSiteMenuOpen(false);
                            onOpenSiteHub({ editTarget: null, category: "ALL" });
                          }}
                        >
                          <Globe size={13} /> 검색 · 카테고리/순서 관리
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const external = /^https?:\/\//i.test(item.url);
            const isActive = item.url === "#roster" && !siteMenuOpen;
            return (
              <a
                key={item.id}
                className={`nav-item-link ${isActive ? "active is-current-item" : ""}`}
                href={item.url}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                onMouseEnter={e => moveNavPill(e.currentTarget)}
                onFocus={e => moveNavPill(e.currentTarget)}
              >
                <span className="nav-item-text">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* 오른쪽 버튼 3개: 마우스를 따라 배경 하이라이트가 이동합니다 */}
        <div
          ref={ctrlRef}
          className="header-controls"
          onMouseLeave={resetCtrlPill}
        >
          <span
            className="ctrl-hover-bg"
            aria-hidden="true"
            style={{
              transform: `translate3d(${ctrlPill.left}px, 0, 0)`,
              width: `${ctrlPill.width}px`,
              opacity: ctrlPill.opacity,
            }}
          />
          <button
            className={`header-edit ${manageMode ? "is-active" : ""}`}
            disabled={!editable}
            onMouseEnter={e => moveCtrlPill(e.currentTarget)}
            onFocus={e => moveCtrlPill(e.currentTarget)}
            onClick={onToggleManage}
            aria-label={manageMode ? "편집 완료" : "로스터 편집"}
          >
            {manageMode ? <Check size={15} /> : <Pencil size={14} />}
            <span>{manageMode ? "편집 완료" : "로스터 편집"}</span>
          </button>
          <button
            className="header-edit header-design"
            disabled={!editable}
            onMouseEnter={e => moveCtrlPill(e.currentTarget)}
            onFocus={e => moveCtrlPill(e.currentTarget)}
            onClick={onOpenDesign}
            aria-label="디자인 편집"
          >
            <Settings2 size={14} />
            <span>디자인 편집</span>
          </button>
          <button
            className="header-edit header-add"
            disabled={!editable}
            onMouseEnter={e => moveCtrlPill(e.currentTarget)}
            onFocus={e => moveCtrlPill(e.currentTarget)}
            onClick={onAddWrestler}
            aria-label="선수 추가"
          >
            <Plus size={15} />
            <span>선수 추가</span>
          </button>
          {onOpenGh && (
            <button className="header-edit header-gh" disabled={!editable} onClick={onOpenGh} aria-label="깃허브 자동 저장 설정">
              <span className={`gh-sync-dot is-${ghStatus}`} />
              <span>{ghStatus === "syncing" ? "깃허브 저장 중" : ghStatus === "synced" ? "깃허브 자동저장 ON" : ghStatus === "error" ? "깃허브 연동 오류" : "깃허브 자동저장"}</span>
            </button>
          )}
          {onBackup && (
            <button className="header-edit header-backup" disabled={!editable} onClick={onBackup} aria-label="백업 파일 저장">
              <span>백업</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
