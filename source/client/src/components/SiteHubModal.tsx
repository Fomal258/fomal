import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useDialogFocus } from "@/lib/a11y";
import { Globe, Heart, Pencil, Plus, RotateCw, Search, Settings2, X } from "lucide-react";
import { defaultSiteCategories, siteDomain, type SiteCategoryItem, type SiteItem } from "@/data/sites";
import { wrestlerLinks, type Wrestler } from "@/lib/storage";

type Props = {
  sites: SiteItem[];
  categories: SiteCategoryItem[];
  wrestlers: Wrestler[];
  initialCategory?: string;
  initialEditSite?: SiteItem | "new" | null;
  onSaveSites: (next: SiteItem[]) => void;
  onSaveCategories: (next: SiteCategoryItem[]) => void;
  onClose: () => void;
};

// 선수와 사이트의 연동 인원수 계산 (링크 도메인 또는 키워드 일치)
export function countLinkedWrestlers(site: SiteItem, wrestlers: Wrestler[]): number {
  const domain = siteDomain(site.url).toLowerCase();
  const keywords = (site.matchKeywords ?? []).map(k => k.toLowerCase()).filter(Boolean);
  if (!domain && !keywords.length) return 0;

  return wrestlers.filter(w => {
    const links = wrestlerLinks(w).map(l => l.toLowerCase());
    const bio = (w.bio ?? "").toLowerCase();
    const byDomain = domain && links.some(l => l.includes(domain));
    const byKeyword = keywords.some(k => links.some(l => l.includes(k)) || bio.includes(k));
    return byDomain || byKeyword;
  }).length;
}

export default function SiteHubModal({
  sites,
  categories,
  wrestlers,
  initialCategory = "ALL",
  initialEditSite = null,
  onSaveSites,
  onSaveCategories,
  onClose,
}: Props) {
  const [category, setCategory] = useState<string>(initialCategory);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SiteItem | "new" | null>(initialEditSite);
  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [catDraft, setCatDraft] = useState<SiteCategoryItem[]>(() => categories.map(c => ({ ...c })));
  const [catError, setCatError] = useState("");

  // 사이트 추가/수정 폼 상태
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [cat, setCat] = useState<string>(() => categories[0]?.key ?? "ETC");
  const [badge, setBadge] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setCatDraft(categories.map(c => ({ ...c })));
  }, [categories]);

  useEffect(() => {
    if (!editing) return;
    const defaultCatKey =
      category !== "ALL" && category !== "FAV" && categories.some(c => c.key === category)
        ? category
        : categories[0]?.key ?? "ETC";
    if (editing === "new") {
      setTitle("");
      setUrl("https://");
      setCat(defaultCatKey);
      setBadge("");
      setDescription("");
      setKeywords("");
      setError("");
    } else {
      setTitle(editing.title);
      setUrl(editing.url);
      setCat(categories.some(c => c.key === editing.category) ? editing.category : defaultCatKey);
      setBadge(editing.badge ?? "");
      setDescription(editing.description);
      setKeywords((editing.matchKeywords ?? []).join(", "));
      setError("");
    }
  }, [editing, category, categories]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editing) setEditing(null);
        else if (catManagerOpen) setCatManagerOpen(false);
        else onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, catManagerOpen, onClose]);

  const catMap = useMemo(() => new Map(categories.map(c => [c.key, c])), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter(s => {
      if (category === "FAV" && !s.favorite) return false;
      if (category !== "ALL" && category !== "FAV" && s.category !== category) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        (s.badge ?? "").toLowerCase().includes(q)
      );
    });
  }, [sites, category, query]);

  const toggleFav = (id: string) => {
    onSaveSites(sites.map(s => (s.id === id ? { ...s, favorite: !s.favorite } : s)));
  };

  const moveSite = (id: string, dir: -1 | 1) => {
    const idx = sites.findIndex(s => s.id === id);
    const nextIdx = idx + dir;
    if (idx < 0 || nextIdx < 0 || nextIdx >= sites.length) return;
    const copy = [...sites];
    [copy[idx], copy[nextIdx]] = [copy[nextIdx], copy[idx]];
    onSaveSites(copy);
  };

  const removeSite = (site: SiteItem) => {
    if (!window.confirm(`'${site.title}' 사이트를 목록에서 삭제할까요?`)) return;
    onSaveSites(sites.filter(s => s.id !== site.id));
    if (editing && editing !== "new" && editing.id === site.id) setEditing(null);
  };

  const saveForm = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError("사이트 이름을 입력해 주세요.");
    let cleanUrl = url.trim();
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("protocol");
      cleanUrl = parsed.href;
    } catch {
      return setError("주소는 http:// 또는 https://로 시작하는 올바른 URL로 입력해 주세요.");
    }

    const fallbackBadge = catMap.get(cat)?.label.split("·")[0]?.trim() || cat;
    const item: SiteItem = {
      id: editing === "new" || !editing ? `site-${Date.now()}` : editing.id,
      title: title.trim(),
      url: cleanUrl,
      category: cat,
      badge: badge.trim() || fallbackBadge,
      description: description.trim() || `${siteDomain(cleanUrl)} 바로가기`,
      matchKeywords: keywords.split(",").map(k => k.trim()).filter(Boolean),
      favorite: editing && editing !== "new" ? editing.favorite : false,
    };

    if (editing === "new") {
      onSaveSites([...sites, item]);
    } else {
      onSaveSites(sites.map(s => (s.id === item.id ? item : s)));
    }
    setEditing(null);
  };

  // ── 카테고리 편집 동작 ────────────────────────────────────────────
  const updateCatDraft = (index: number, patch: Partial<SiteCategoryItem>) => {
    setCatDraft(prev => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
    setCatError("");
  };

  const moveCatDraft = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= catDraft.length) return;
    const copy = [...catDraft];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    setCatDraft(copy);
  };

  const addCatDraft = () => {
    const id = `CAT-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    setCatDraft(prev => [...prev, { key: id, label: "새 카테고리", color: "#c9162b" }]);
    setCatError("");
  };

  const removeCatDraft = (index: number) => {
    if (catDraft.length <= 1) {
      setCatError("최소 1개의 카테고리는 남아 있어야 합니다.");
      return;
    }
    const target = catDraft[index];
    const usedCount = sites.filter(s => s.category === target.key).length;
    if (usedCount > 0 && !window.confirm(`'${target.label}' 카테고리에 속한 사이트가 ${usedCount}개 있습니다. 삭제하면 남은 첫 번째 카테고리로 자동 이동됩니다. 삭제할까요?`)) {
      return;
    }
    setCatDraft(prev => prev.filter((_, i) => i !== index));
    setCatError("");
  };

  const saveCategoriesForm = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = catDraft.map(c => ({
      ...c,
      label: c.label.trim(),
      color: /^#[0-9a-f]{6}$/i.test(c.color.trim()) ? c.color.trim() : "#111111",
    }));
    if (cleaned.some(c => !c.label)) {
      setCatError("모든 카테고리의 이름을 입력해 주세요.");
      return;
    }
    const validKeys = new Set(cleaned.map(c => c.key));
    const fallbackKey = cleaned[0].key;
    // 삭제된 카테고리에 있던 사이트들을 첫 번째 카테고리로 안전하게 이동
    const migratedSites = sites.map(s => (validKeys.has(s.category) ? s : { ...s, category: fallbackKey }));
    if (migratedSites.some((s, i) => s.category !== sites[i].category)) {
      onSaveSites(migratedSites);
    }
    onSaveCategories(cleaned);
    if (category !== "ALL" && category !== "FAV" && !validKeys.has(category)) {
      setCategory("ALL");
    }
    setCatManagerOpen(false);
  };

  const modalRef = useRef<HTMLElement | null>(null);
  useDialogFocus(modalRef);

  return (
    <div className="site-hub-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <section ref={modalRef} className="site-hub-modal" role="dialog" aria-modal="true" aria-labelledby="site-hub-title" onMouseDown={e => e.stopPropagation()}>
        <header className="site-hub-header">
          <div>
            <p className="site-hub-kicker">WRESTLING NETWORK & LINKS</p>
            <h2 id="site-hub-title">SITE DIRECTORY</h2>
          </div>
          <div className="site-hub-header-actions">
            <button
              type="button"
              className={`site-hub-cat-btn ${catManagerOpen ? "is-active" : ""}`}
              onClick={() => {
                setEditing(null);
                setCatManagerOpen(v => !v);
              }}
            >
              <Settings2 size={14} />
              <span>카테고리 편집</span>
            </button>
            <button
              type="button"
              className="site-hub-add-btn"
              onClick={() => {
                setCatManagerOpen(false);
                setEditing("new");
              }}
            >
              <Plus size={14} />
              <span>사이트 추가</span>
            </button>
            <button type="button" className="site-hub-close" onClick={onClose} aria-label="사이트 모달 닫기">
              <X size={18} />
            </button>
          </div>
        </header>

        {/* 카테고리 추가·수정·삭제·순서변경 패널 */}
        {catManagerOpen && (
          <form className="site-cat-editor" onSubmit={saveCategoriesForm}>
            <div className="site-editor-top">
              <div>
                <strong>카테고리 탭 관리</strong>
                <span className="site-cat-sub">탭 이름·배지 색상을 고치거나 새 카테고리를 추가·삭제하고 순서를 바꿀 수 있습니다.</span>
              </div>
              <button
                type="button"
                className="site-cat-reset"
                onClick={() => {
                  setCatDraft(defaultSiteCategories.map(c => ({ ...c })));
                  setCatError("");
                }}
              >
                <RotateCw size={12} /> 기본 카테고리로 복원
              </button>
            </div>

            <div className="site-cat-list">
              {catDraft.map((item, idx) => (
                <div key={item.key} className="site-cat-row">
                  <span className="site-cat-num">{String(idx + 1).padStart(2, "0")}</span>
                  <input
                    className="site-cat-name"
                    value={item.label}
                    onChange={e => updateCatDraft(idx, { label: e.target.value })}
                    placeholder="카테고리 탭 이름 (예: VIDEO · 영상)"
                    aria-label={`카테고리 ${idx + 1} 이름`}
                  />
                  <label className="site-cat-color" title="배지 색상 선택">
                    <input
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(item.color) ? item.color : "#111111"}
                      onChange={e => updateCatDraft(idx, { color: e.target.value })}
                      aria-label={`카테고리 ${idx + 1} 색상`}
                    />
                    <span>{item.color}</span>
                  </label>
                  <div className="site-cat-row-btns">
                    <button type="button" disabled={idx === 0} onClick={() => moveCatDraft(idx, -1)} aria-label="위로 이동">↑</button>
                    <button type="button" disabled={idx === catDraft.length - 1} onClick={() => moveCatDraft(idx, 1)} aria-label="아래로 이동">↓</button>
                    <button type="button" className="site-cat-del" onClick={() => removeCatDraft(idx)} aria-label={`${item.label} 삭제`}>삭제</button>
                  </div>
                </div>
              ))}
            </div>

            {catError && <p className="site-editor-error">{catError}</p>}

            <div className="site-editor-actions">
              <button type="button" className="site-cat-add" onClick={addCatDraft}>
                <Plus size={13} /> 카테고리 추가
              </button>
              <span className="site-editor-spacer" />
              <button type="button" className="editor-secondary" onClick={() => setCatManagerOpen(false)}>취소</button>
              <button type="submit" className="editor-primary">카테고리 저장</button>
            </div>
          </form>
        )}

        {/* 사이트 추가/수정 폼 (⑤ 직접 추가·편집) */}
        {editing && (
          <form className="site-editor-panel" onSubmit={saveForm}>
            <div className="site-editor-top">
              <strong>{editing === "new" ? "새 사이트 등록" : "사이트 정보 수정"}</strong>
              <button type="button" onClick={() => setEditing(null)}>취소</button>
            </div>
            <div className="site-editor-grid">
              <label>
                <span>사이트 이름 *</span>
                <input value={title} onChange={e => setTitle(e.target.value)} placeholder="예: CAGEMATCH" />
              </label>
              <label>
                <span>주소 (URL) *</span>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com" />
              </label>
              <label>
                <span>카테고리</span>
                <select value={cat} onChange={e => setCat(e.target.value)}>
                  {categories.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>배지 문구 (선택)</span>
                <input value={badge} onChange={e => setBadge(e.target.value)} placeholder="예: STATS DB, LIVE PPV" />
              </label>
              <label className="site-editor-wide">
                <span>한 줄 설명</span>
                <input value={description} onChange={e => setDescription(e.target.value)} placeholder="이 사이트에 대한 간단한 설명을 입력하세요." />
              </label>
              <label className="site-editor-wide">
                <span>로스터 연동 키워드 (쉼표로 구분, 선수 링크·소개에 포함 시 연동 인원 표시)</span>
                <input value={keywords} onChange={e => setKeywords(e.target.value)} placeholder="예: youtube.com, cagematch, njpw" />
              </label>
            </div>
            {error && <p className="site-editor-error">{error}</p>}
            <div className="site-editor-actions">
              {editing !== "new" && (
                <button type="button" className="site-editor-delete" onClick={() => removeSite(editing)}>
                  삭제
                </button>
              )}
              <span className="site-editor-spacer" />
              <button type="button" className="editor-secondary" onClick={() => setEditing(null)}>닫기</button>
              <button type="submit" className="editor-primary">저장하기</button>
            </div>
          </form>
        )}

        {/* 검색 + 카테고리 탭 필터 (③ 북마크 런처 + 탭 바로 뒤 편집 버튼) */}
        <div className="site-hub-toolbar">
          <div className="site-hub-tabs" role="tablist" aria-label="사이트 카테고리">
            <button
              type="button"
              role="tab"
              aria-selected={category === "ALL"}
              className={`site-hub-tab ${category === "ALL" ? "is-active" : ""}`}
              onClick={() => setCategory("ALL")}
            >
              전체
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={category === "FAV"}
              className={`site-hub-tab ${category === "FAV" ? "is-active" : ""}`}
              onClick={() => setCategory("FAV")}
            >
              ★ 즐겨찾기
            </button>
            {categories.map(c => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={category === c.key}
                className={`site-hub-tab ${category === c.key ? "is-active" : ""}`}
                onClick={() => setCategory(c.key)}
              >
                {c.label}
              </button>
            ))}
            <button
              type="button"
              className={`site-hub-tab site-hub-tab-edit ${catManagerOpen ? "is-active" : ""}`}
              onClick={() => {
                setEditing(null);
                setCatManagerOpen(v => !v);
              }}
              title="카테고리 탭 추가·수정·삭제"
            >
              <Pencil size={11} /> 탭 편집
            </button>
          </div>
          <div className="site-hub-search">
            <Search size={15} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="사이트 이름, 설명, 도메인 검색..."
              aria-label="사이트 검색"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="검색어 지우기">
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* 미니 프리뷰 카드 그리드 + 로스터 연동 배지 (④) */}
        <div className="site-hub-body">
          {filtered.length === 0 ? (
            <div className="site-hub-empty">
              <Globe size={26} />
              <strong>표시할 사이트가 없습니다</strong>
              <span>다른 카테고리를 선택하거나 상단의 '+ 사이트 추가' 버튼으로 새 링크를 등록해 보세요.</span>
            </div>
          ) : (
            <div className="site-card-grid">
              {filtered.map(site => {
                const domain = siteDomain(site.url);
                const linkedCount = countLinkedWrestlers(site, wrestlers);
                const idx = sites.findIndex(s => s.id === site.id);
                const catInfo = catMap.get(site.category);
                const badgeColor = catInfo?.color ?? "#111111";
                const badgeLabel = site.badge || catInfo?.label.split("·")[0]?.trim() || site.category;
                return (
                  <article key={site.id} className="site-card">
                    <div className="site-card-top">
                      <span className="site-card-monogram" aria-hidden="true">
                        {site.title.trim().slice(0, 2).toUpperCase()}
                      </span>
                      <div className="site-card-meta">
                        <div className="site-card-badges">
                          <span className="site-badge" style={{ backgroundColor: badgeColor }}>{badgeLabel}</span>
                          {linkedCount > 0 && (
                            <span className="site-roster-badge" title="이 사이트가 프로필에 연결된 로스터 선수 수">
                              로스터 연동 {linkedCount}명
                            </span>
                          )}
                        </div>
                        <span className="site-card-domain">{domain}</span>
                      </div>
                      <button
                        type="button"
                        className={`site-fav-btn ${site.favorite ? "is-fav" : ""}`}
                        onClick={() => toggleFav(site.id)}
                        aria-label={site.favorite ? "즐겨찾기 해제" : "즐겨찾기 등록"}
                      >
                        <Heart size={14} fill={site.favorite ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <a className="site-card-main" href={site.url} target="_blank" rel="noopener noreferrer">
                      <h3>
                        <span>{site.title}</span>
                        <em className="site-card-arrow">↗</em>
                      </h3>
                      <p>{site.description}</p>
                    </a>

                    <div className="site-card-footer">
                      <div className="site-card-order">
                        <button type="button" disabled={idx <= 0} onClick={() => moveSite(site.id, -1)} aria-label="앞으로 이동">←</button>
                        <button type="button" disabled={idx < 0 || idx >= sites.length - 1} onClick={() => moveSite(site.id, 1)} aria-label="뒤로 이동">→</button>
                      </div>
                      <div className="site-card-Controls">
                        <button
                          type="button"
                          className="site-card-edit"
                          onClick={() => {
                            setCatManagerOpen(false);
                            setEditing(site);
                          }}
                        >
                          <Pencil size={12} /> 수정
                        </button>
                        <a className="site-card-visit" href={site.url} target="_blank" rel="noopener noreferrer">
                          방문하기 ↗
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
