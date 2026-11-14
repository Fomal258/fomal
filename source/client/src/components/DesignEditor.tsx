import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { defaultDesign, type HeroBlock, type SiteDesign } from "@/lib/design";

// "디자인 편집" 팝업. 화면의 입력칸과 SiteDesign 필드가 1:1로 대응합니다.

const newId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// "#앵커" 또는 http(s) 주소만 허용
const isValidLink = (value: string) => {
  const link = value.trim();
  if (!link) return false;
  if (link.startsWith("#")) return link.length > 1 && !/[\s#]/.test(link.slice(1));
  try {
    const url = new URL(link);
    return (url.protocol === "http:" || url.protocol === "https:") && Boolean(url.hostname);
  } catch {
    return false;
  }
};
const normalizeLink = (value: string) => (value.trim().startsWith("#") ? value.trim() : new URL(value.trim()).href);

const blockTypeLabel: Record<HeroBlock["type"], string> = { eyebrow: "아이브로우", title: "제목", text: "본문", button: "버튼" };

// 색상 입력 묶음 (label = 화면 제목, aria = 코드 입력칸의 접근성 이름)
type ColorKey = keyof Pick<
  SiteDesign,
  | "headerBg" | "headerText" | "heroBg" | "heroText" | "accent" | "profileHighlight"
  | "rosterBg" | "rosterText" | "profileModalBg" | "profileModalHeaderBg"
  | "profileModalText" | "profileModalAccent" | "profileModalFieldBg"
>;
const colorFields = (items: [ColorKey, string, string?][]) =>
  items.map(([key, label, aria]) => ({ key, label, aria: aria ?? `${label} 코드` }));

const headerColors = colorFields([
  ["headerBg", "헤더 배경색"],
  ["headerText", "헤더 글자색"],
]);
const heroColors = colorFields([
  ["heroBg", "메인 배경색"],
  ["heroText", "메인 글자색"],
  ["accent", "포인트색"],
  ["profileHighlight", "프로필 호버 하이라이트", "프로필 호버 하이라이트 색상 코드"],
]);
const rosterColors = colorFields([
  ["rosterBg", "로스터 기본 배경색"],
  ["rosterText", "로스터 글자색"],
]);
const modalColors = colorFields([
  ["profileModalBg", "팝업 기본 배경색", "프로필 팝업 배경색 코드"],
  ["profileModalHeaderBg", "팝업 헤더 배경", "프로필 팝업 헤더 배경색 코드"],
  ["profileModalText", "팝업 글자색", "프로필 팝업 글자색 코드"],
  ["profileModalAccent", "팝업 포인트색", "프로필 팝업 포인트색 코드"],
  ["profileModalFieldBg", "입력칸 배경", "프로필 팝업 입력칸 배경색 코드"],
]);

// 폼 한 칸
const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="design-field">
    <span>{label}</span>
    {children}
  </label>
);

// 색상 한 칸 (색상 선택기 + 코드 입력)
const ColorField = ({ value, onChange, aria }: { value: string; onChange: (v: string) => void; aria: string }) => (
  <span className="design-color-field">
    <input type="color" value={value} onChange={event => onChange(event.target.value)} />
    <input value={value} onChange={event => onChange(event.target.value)} aria-label={aria} />
  </span>
);

// 입력하는 즉시 바뀌는 작은 미리보기
function LivePreview({ design, replay, onReplay }: { design: SiteDesign; replay: number; onReplay: () => void }) {
  const pick = (type: HeroBlock["type"]) => design.heroBlocks.find(block => block.type === type)?.text;
  const title = pick("title") || "MEET THE ROSTER";
  const rosterBgImg =
    design.rosterBgMode === "gradient"
      ? `linear-gradient(${design.rosterGradientAngle}deg, ${design.rosterGradientFrom}, ${design.rosterGradientTo})`
      : design.rosterBgMode === "image" && design.rosterBgImage
        ? `url("${design.rosterBgImage}")`
        : undefined;

  return (
    <section className="design-live-preview" aria-label="실시간 디자인 미리보기">
      <div className="design-preview-label">
        LIVE PREVIEW <span>입력하는 즉시 반영됩니다</span>
      </div>
      <div className="design-preview-frame" style={{ fontSize: `${design.fontScale}%` }}>
        {design.showHeader && (
          <div className="design-preview-header" style={{ background: design.headerBg, color: design.headerText }}>
            {design.showBrand && (
              <strong>
                {design.brandTop}
                <small>{design.brandBottom}</small>
              </strong>
            )}
            <nav>
              {design.navItems.slice(0, 4).map(item => (
                <span key={item.id}>{item.label || "메뉴"}</span>
              ))}
            </nav>
          </div>
        )}
        {design.showHero && (
          <div
            className="design-preview-hero"
            style={{
              backgroundColor: design.heroBg,
              color: design.heroText,
              backgroundImage: design.heroImage ? `linear-gradient(#0008,#0008),url("${design.heroImage}")` : undefined,
              textAlign: design.heroAlign,
            }}
          >
            {pick("eyebrow") && <small>{pick("eyebrow")}</small>}
            <b>{title}</b>
            {pick("text") && <p>{pick("text")}</p>}
          </div>
        )}
        <div
          key={replay}
          className={`design-preview-popup anim-${design.profileModalAnimation}`}
          style={{
            "--modal-duration": `${design.profileModalDuration}ms`,
            backgroundColor: design.profileModalBg,
            backgroundImage:
              design.profileModalBgMode === "gradient"
                ? `linear-gradient(${design.profileModalGradientAngle}deg, ${design.profileModalGradientFrom}, ${design.profileModalGradientTo})`
                : design.profileModalBgMode === "image" && design.profileModalBgImage
                  ? `url("${design.profileModalBgImage}")`
                  : undefined,
            borderColor: design.profileModalBorder,
            borderWidth: `${design.profileModalBorderWidth}px`,
            color: design.profileModalText,
            ["--preview-overlay" as string]: String(design.profileModalOverlay / 100),
          } as React.CSSProperties}
        >
          <span className="design-preview-popup-head" style={{ background: design.profileModalHeaderBg }}>SUPERSTAR PROFILE</span>
          <b>선수 이름</b>
          <p>프로필 팝업 미리보기</p>
        </div>
        <button type="button" className="design-replay" onClick={onReplay}>
          애니메이션 미리보기
        </button>

        <div
          className="design-preview-roster"
          style={{
            backgroundColor: design.rosterBg,
            backgroundImage: rosterBgImg,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: design.rosterText,
          }}
        >
          <small style={{ color: design.accent }}>THE ROSTER</small>
          <strong>{design.rosterTitle}</strong>
          <p>{design.rosterSubtitle}</p>
          <div>
            {[0, 1, 2, 3].map(index => (
              <i key={index}>PROFILE</i>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function DesignEditor({ design, onSave, onClose }: { design: SiteDesign; onSave: (data: SiteDesign) => void; onClose: () => void }) {
  // 원본을 복사해 편집하고, 저장할 때 한 번에 반영합니다.
  const [draft, setDraft] = useState<SiteDesign>(() => ({
    ...defaultDesign,
    ...design,
    navItems: design.navItems.map(item => ({ ...item })),
    heroBlocks: design.heroBlocks.map(block => ({ ...block })),
  }));
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [replay, setReplay] = useState(0); // 미리보기 재생 횟수
  const imageInputRef = useRef<HTMLInputElement>(null);
  const rosterImageInputRef = useRef<HTMLInputElement>(null);
  const modalImageInputRef = useRef<HTMLInputElement>(null);

  // Esc 로 닫기
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // 값 하나 바꾸기 / 목록 항목 바꾸기·이동·삭제
  const update = <K extends keyof SiteDesign>(key: K, value: SiteDesign[K]) => {
    setDraft(current => ({ ...current, [key]: value }));
    setError("");
  };
  const patchItem = <T,>(list: T[], index: number, patch: Partial<T>) => list.map((item, i) => (i === index ? { ...item, ...patch } : item));
  const moveItem = <T,>(list: T[], index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= list.length) return list;
    const copy = [...list];
    [copy[index], copy[next]] = [copy[next], copy[index]];
    return copy;
  };

  // 이미지 파일 읽기 공통 헬퍼
  const readImageFile = (event: ChangeEvent<HTMLInputElement>, targetKey: "heroImage" | "rosterBgImage" | "profileModalBgImage") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("배경 이미지는 이미지 파일만 업로드할 수 있습니다.");
    if (file.size > 10 * 1024 * 1024) return setError("배경 이미지는 10MB 이하만 업로드할 수 있습니다.");
    const reader = new FileReader();
    setReading(true);
    reader.onload = () => typeof reader.result === "string" && update(targetKey, reader.result);
    reader.onerror = () => setError("이미지를 읽지 못했습니다. 다시 시도해 주세요.");
    reader.onloadend = () => setReading(false);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  // 저장 전 검사: 색상 → 메뉴 링크 → 버튼 링크 → 빈 문구
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (reading) return;
    const colors = [
      ...headerColors,
      ...heroColors,
      ...rosterColors,
      ...modalColors,
    ].map(f => draft[f.key]);
    colors.push(draft.profileModalBorder);
    if (draft.rosterBgMode === "gradient") colors.push(draft.rosterGradientFrom, draft.rosterGradientTo);
    if (draft.profileModalBgMode === "gradient") colors.push(draft.profileModalGradientFrom, draft.profileModalGradientTo);
    if (!colors.every(color => /^#[0-9a-f]{6}$/i.test(color))) return setError("색상은 #ffffff처럼 6자리 색상 코드로 입력해 주세요.");
    if (draft.navItems.some(item => !item.label.trim() || !isValidLink(item.url)))
      return setError("내비게이션 메뉴 이름을 입력하고 링크는 #앵커 또는 http://, https:// 주소로 입력해 주세요.");
    if (draft.heroBlocks.some(block => block.type === "button" && (!block.text.trim() || !block.url || !isValidLink(block.url))))
      return setError("버튼 문구를 입력하고 링크는 #앵커 또는 http://, https:// 주소로 입력해 주세요.");
    if (draft.heroBlocks.some(block => !block.text.trim())) return setError("메인 텍스트 블록의 문구를 입력해 주세요.");

    onSave({
      ...draft,
      brandTop: draft.brandTop.trim(),
      brandBottom: draft.brandBottom.trim(),
      navItems: draft.navItems.map(item => ({ ...item, label: item.label.trim(), url: normalizeLink(item.url) })),
      heroBlocks: draft.heroBlocks.map(block => ({
        ...block,
        text: block.text.trim(),
        ...(block.type === "button" && block.url ? { url: normalizeLink(block.url) } : {}),
      })),
    });
  };

  return (
    <div className="design-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <form className="design-modal" role="dialog" aria-modal="true" aria-labelledby="design-editor-title" onSubmit={onSubmit} onMouseDown={event => event.stopPropagation()}>
        <header className="design-header">
          <div>
            <p className="design-kicker">SITE DESIGN</p>
            <h2 id="design-editor-title">디자인 설정</h2>
          </div>
          <button className="design-icon-button" type="button" onClick={onClose} aria-label="디자인 설정 닫기">
            ×
          </button>
        </header>

        <div className="design-body">
          <LivePreview design={draft} replay={replay} onReplay={() => setReplay(value => value + 1)} />

          {/* 1) 헤더 */}
          <section className="design-section" aria-labelledby="design-header-section">
            <div className="design-section-heading">
              <div>
                <h3 id="design-header-section">헤더</h3>
                <p>사이트 상단 브랜드와 내비게이션을 설정하세요.</p>
              </div>
              <label className="design-switch">
                <input type="checkbox" checked={draft.showHeader} onChange={event => update("showHeader", event.target.checked)} />
                <span>헤더 표시</span>
              </label>
            </div>

            <div className="design-grid design-grid-two">
              <label className="design-switch">
                <input type="checkbox" checked={draft.showBrand} onChange={event => update("showBrand", event.target.checked)} />
                <span>로고 표시</span>
              </label>
              <span />
              <Field label="로고 위 줄">
                <input value={draft.brandTop} onChange={event => update("brandTop", event.target.value)} />
              </Field>
              <Field label="로고 아래 줄">
                <input value={draft.brandBottom} onChange={event => update("brandBottom", event.target.value)} />
              </Field>
              {headerColors.map(field => (
                <Field key={field.key} label={field.label}>
                  <ColorField value={draft[field.key]} onChange={value => update(field.key, value)} aria={field.aria} />
                </Field>
              ))}
            </div>

            <div className="design-list-heading">
              <h4>내비게이션 메뉴</h4>
              <button className="design-add-button" type="button" onClick={() => update("navItems", [...draft.navItems, { id: newId("nav"), label: "새 메뉴", url: "#roster" }])}>
                + 메뉴 추가
              </button>
            </div>
            <div className="design-list">
              {draft.navItems.length === 0 && <p className="design-empty">메뉴가 없습니다.</p>}
              {draft.navItems.map((item, index) => (
                <div className="design-list-row" key={item.id}>
                  <div className="design-row-number">{String(index + 1).padStart(2, "0")}</div>
                  <div className="design-row-fields">
                    <input aria-label={`메뉴 ${index + 1} 이름`} value={item.label} onChange={event => update("navItems", patchItem(draft.navItems, index, { label: event.target.value }))} placeholder="메뉴 이름" />
                    <input aria-label={`메뉴 ${index + 1} 링크`} value={item.url} onChange={event => update("navItems", patchItem(draft.navItems, index, { url: event.target.value }))} placeholder="#roster 또는 https://example.com" />
                  </div>
                  <div className="design-row-actions">
                    <button type="button" onClick={() => update("navItems", moveItem(draft.navItems, index, -1))} disabled={index === 0} aria-label="메뉴 위로 이동">↑</button>
                    <button type="button" onClick={() => update("navItems", moveItem(draft.navItems, index, 1))} disabled={index === draft.navItems.length - 1} aria-label="메뉴 아래로 이동">↓</button>
                    <button type="button" onClick={() => update("navItems", draft.navItems.filter((_, i) => i !== index))} aria-label={`${item.label || "메뉴"} 삭제`}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 2) 메인(히어로) */}
          <section className="design-section" aria-labelledby="design-hero-section">
            <div className="design-section-heading">
              <div>
                <h3 id="design-hero-section">히어로 (첫 화면)</h3>
                <p>첫 화면의 배경과 콘텐츠 블록을 자유롭게 구성하세요.</p>
              </div>
              <label className="design-switch">
                <input type="checkbox" checked={draft.showHero} onChange={event => update("showHero", event.target.checked)} />
                <span>히어로 표시</span>
              </label>
            </div>

            <div className="design-grid design-grid-two">
              {heroColors.map(field => (
                <Field key={field.key} label={field.label}>
                  <ColorField value={draft[field.key]} onChange={value => update(field.key, value)} aria={field.aria} />
                </Field>
              ))}
              <Field label="텍스트 정렬">
                <select value={draft.heroAlign} onChange={event => update("heroAlign", event.target.value as SiteDesign["heroAlign"])}>
                  <option value="left">왼쪽</option>
                  <option value="center">가운데</option>
                  <option value="right">오른쪽</option>
                </select>
              </Field>
              <label className="design-field design-range-field">
                <span>
                  히어로 필름 이동 속도 <strong>{draft.heroFilmSpeed === 0 ? "정지 (0%)" : `${draft.heroFilmSpeed}%`}</strong>
                </span>
                <input
                  type="range"
                  min="0"
                  max="300"
                  step="10"
                  value={draft.heroFilmSpeed}
                  onChange={event => update("heroFilmSpeed", Number(event.target.value))}
                  aria-label="히어로 필름 이동 속도"
                />
                <div className="design-range-labels">
                  <span>0% (정지)</span>
                  <span>100% (기본 천천히)</span>
                  <span>300% (빠르게)</span>
                </div>
              </label>
            </div>

            <div className="design-image-field">
              <div>
                <span className="design-field-label">히어로 배경 이미지</span>
                <p>업로드하지 않으면 선수 프로필 사진들이 사선 필름 스트립으로 자동 재생됩니다. (10MB 이하)</p>
              </div>
              <input ref={imageInputRef} className="design-visually-hidden" type="file" accept="image/*" disabled={reading} onChange={e => readImageFile(e, "heroImage")} />
              {draft.heroImage ? (
                <div className="design-image-preview">
                  <img src={draft.heroImage} alt="히어로 배경 미리보기" />
                  <button type="button" disabled={reading} onClick={() => update("heroImage", "")}>이미지 제거</button>
                </div>
              ) : (
                <button className="design-upload-button" type="button" disabled={reading} onClick={() => imageInputRef.current?.click()}>
                  {reading ? "이미지 읽는 중" : "배경 이미지 업로드"}
                </button>
              )}
            </div>

            <div className="design-list-heading">
              <h4>텍스트 블록</h4>
              <button className="design-add-button" type="button" onClick={() => update("heroBlocks", [...draft.heroBlocks, { id: newId("hero"), type: "text", text: "새 텍스트" }])}>
                + 블록 추가
              </button>
            </div>
            <div className="design-list">
              {draft.heroBlocks.length === 0 && <p className="design-empty">텍스트 블록이 없습니다.</p>}
              {draft.heroBlocks.map((block, index) => (
                <div className="design-block-row" key={block.id}>
                  <div className="design-row-number">{String(index + 1).padStart(2, "0")}</div>
                  <div className="design-row-fields">
                    <select
                      value={block.type}
                      onChange={event => update("heroBlocks", patchItem(draft.heroBlocks, index, { type: event.target.value as HeroBlock["type"], ...(event.target.value === "button" && !block.url ? { url: "#roster" } : {}) }))}
                      aria-label={`블록 ${index + 1} 종류`}
                    >
                      {Object.entries(blockTypeLabel).map(([type, label]) => (
                        <option key={type} value={type}>{label}</option>
                      ))}
                    </select>
                    <input aria-label={`블록 ${index + 1} 문구`} value={block.text} onChange={event => update("heroBlocks", patchItem(draft.heroBlocks, index, { text: event.target.value }))} placeholder="문구" />
                    {block.type === "button" && (
                      <input aria-label={`블록 ${index + 1} 버튼 링크`} value={block.url ?? ""} onChange={event => update("heroBlocks", patchItem(draft.heroBlocks, index, { url: event.target.value }))} placeholder="#roster 또는 https://example.com" />
                    )}
                  </div>
                  <div className="design-row-actions">
                    <button type="button" onClick={() => update("heroBlocks", moveItem(draft.heroBlocks, index, -1))} disabled={index === 0} aria-label="블록 위로 이동">↑</button>
                    <button type="button" onClick={() => update("heroBlocks", moveItem(draft.heroBlocks, index, 1))} disabled={index === draft.heroBlocks.length - 1} aria-label="블록 아래로 이동">↓</button>
                    <button type="button" onClick={() => update("heroBlocks", draft.heroBlocks.filter((_, i) => i !== index))} aria-label={`${blockTypeLabel[block.type]} 삭제`}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 3) 로스터 섹션 & 메인 페이지 백그라운드 편집 */}
            <div className="design-subsection">
              <h4>로스터 섹션 & 메인 백그라운드</h4>
              <p className="design-help">메인 페이지(로스터 영역)의 제목과 배경(색상 / 그라데이션 / 이미지)을 설정합니다.</p>
              <div className="design-grid design-grid-two">
                <Field label="로스터 제목">
                  <input value={draft.rosterTitle} onChange={event => update("rosterTitle", event.target.value)} />
                </Field>
                <Field label="로스터 설명">
                  <input value={draft.rosterSubtitle} onChange={event => update("rosterSubtitle", event.target.value)} />
                </Field>
                {rosterColors.map(field => (
                  <Field key={field.key} label={field.label}>
                    <ColorField value={draft[field.key]} onChange={value => update(field.key, value)} aria={field.aria} />
                  </Field>
                ))}
                <Field label="메인 배경 종류">
                  <select value={draft.rosterBgMode} onChange={event => update("rosterBgMode", event.target.value as SiteDesign["rosterBgMode"])}>
                    <option value="color">단색 (아레나 조명 효과 포함)</option>
                    <option value="gradient">그라데이션</option>
                    <option value="image">이미지 업로드</option>
                  </select>
                </Field>
                <label className="design-field design-range-field">
                  <span>
                    메인 배경 어둡게 <strong>{draft.rosterOverlay}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="85"
                    step="5"
                    value={draft.rosterOverlay}
                    onChange={event => update("rosterOverlay", Number(event.target.value))}
                    aria-label="메인 배경 어둡게"
                  />
                </label>
              </div>

              {draft.rosterBgMode === "gradient" && (
                <div className="design-grid design-grid-two" style={{ marginTop: 12 }}>
                  <Field label="그라데이션 시작색">
                    <ColorField value={draft.rosterGradientFrom} onChange={value => update("rosterGradientFrom", value)} aria="메인 배경 그라데이션 시작색 코드" />
                  </Field>
                  <Field label="그라데이션 끝색">
                    <ColorField value={draft.rosterGradientTo} onChange={value => update("rosterGradientTo", value)} aria="메인 배경 그라데이션 끝색 코드" />
                  </Field>
                  <label className="design-field design-range-field">
                    <span>
                      그라데이션 각도 <strong>{draft.rosterGradientAngle}°</strong>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={draft.rosterGradientAngle}
                      onChange={event => update("rosterGradientAngle", Number(event.target.value))}
                      aria-label="메인 배경 그라데이션 각도"
                    />
                  </label>
                </div>
              )}

              {draft.rosterBgMode === "image" && (
                <div className="design-image-field">
                  <div>
                    <span className="design-field-label">메인(로스터) 배경 이미지</span>
                    <p>10MB 이하 이미지 파일. 로스터 전체 영역 배경으로 깔립니다.</p>
                  </div>
                  <input ref={rosterImageInputRef} className="design-visually-hidden" type="file" accept="image/*" disabled={reading} onChange={e => readImageFile(e, "rosterBgImage")} />
                  {draft.rosterBgImage ? (
                    <div className="design-image-preview">
                      <img src={draft.rosterBgImage} alt="메인 배경 미리보기" />
                      <button type="button" disabled={reading} onClick={() => update("rosterBgImage", "")}>이미지 제거</button>
                    </div>
                  ) : (
                    <button className="design-upload-button" type="button" disabled={reading} onClick={() => rosterImageInputRef.current?.click()}>
                      {reading ? "이미지 읽는 중" : "배경 이미지 업로드"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4) 프로필 팝업 & 팝업 백그라운드 편집 */}
            <div className="design-subsection">
              <h4>프로필 팝업 & 팝업 백그라운드</h4>
              <p className="design-help">선수 이름을 눌렀을 때 열리는 정보·수정 팝업의 배경(색상 / 그라데이션 / 이미지)과 스타일을 설정합니다.</p>
              <div className="design-grid design-grid-two">
                {modalColors.map(field => (
                  <Field key={field.key} label={field.label}>
                    <ColorField value={draft[field.key]} onChange={value => update(field.key, value)} aria={field.aria} />
                  </Field>
                ))}

                {/* 팝업 테두리 */}
                <Field label="테두리 색">
                  <ColorField value={draft.profileModalBorder} onChange={value => update("profileModalBorder", value)} aria="프로필 팝업 테두리 색 코드" />
                </Field>
                <Field label="테두리 두께">
                  <select value={draft.profileModalBorderWidth} onChange={event => update("profileModalBorderWidth", Number(event.target.value))}>
                    <option value={0}>없음</option>
                    <option value={1}>1px</option>
                    <option value={2}>2px</option>
                    <option value={3}>3px</option>
                  </select>
                </Field>
                <Field label="열림 애니메이션">
                  <select
                    value={draft.profileModalAnimation}
                    onChange={event => update("profileModalAnimation", event.target.value as SiteDesign["profileModalAnimation"])}
                  >
                    <option value="none">없음</option>
                    <option value="fade">페이드 인</option>
                    <option value="slide">슬라이드 업</option>
                    <option value="zoom">확대</option>
                  </select>
                </Field>
                <label className="design-field design-range-field">
                  <span>
                    애니메이션 속도 <strong>{draft.profileModalDuration}ms</strong>
                  </span>
                  <input
                    type="range"
                    min="100"
                    max="800"
                    step="20"
                    value={draft.profileModalDuration}
                    onChange={event => update("profileModalDuration", Number(event.target.value))}
                    aria-label="팝업 애니메이션 속도"
                    disabled={draft.profileModalAnimation === "none"}
                  />
                  <div className="design-range-labels">
                    <span>빠르게</span>
                    <span>260ms</span>
                    <span>느리게</span>
                  </div>
                </label>
                <button type="button" className="design-replay" onClick={() => setReplay(value => value + 1)}>
                  애니메이션 미리보기
                </button>
              </div>

              {/* 팝업 배경 방식 */}
              <div className="design-list-heading">
                <h4>팝업 백그라운드 편집 (단색 · 그라데이션 · 이미지)</h4>
              </div>
              <div className="design-grid design-grid-two">
                <Field label="팝업 배경 종류">
                  <select value={draft.profileModalBgMode} onChange={event => update("profileModalBgMode", event.target.value as SiteDesign["profileModalBgMode"])}>
                    <option value="color">단색</option>
                    <option value="gradient">그라데이션</option>
                    <option value="image">이미지 업로드</option>
                  </select>
                </Field>
                <label className="design-field design-range-field">
                  <span>
                    팝업 배경 어둡게 <strong>{draft.profileModalOverlay}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={draft.profileModalOverlay}
                    onChange={event => update("profileModalOverlay", Number(event.target.value))}
                    aria-label="팝업 배경 어둡게"
                  />
                </label>
              </div>

              {draft.profileModalBgMode === "gradient" && (
                <div className="design-grid design-grid-two" style={{ marginTop: 12 }}>
                  <Field label="시작색">
                    <ColorField value={draft.profileModalGradientFrom} onChange={value => update("profileModalGradientFrom", value)} aria="팝업 그라데이션 시작색 코드" />
                  </Field>
                  <Field label="끝색">
                    <ColorField value={draft.profileModalGradientTo} onChange={value => update("profileModalGradientTo", value)} aria="팝업 그라데이션 끝색 코드" />
                  </Field>
                  <label className="design-field design-range-field">
                    <span>
                      각도 <strong>{draft.profileModalGradientAngle}°</strong>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={draft.profileModalGradientAngle}
                      onChange={event => update("profileModalGradientAngle", Number(event.target.value))}
                      aria-label="팝업 그라데이션 각도"
                    />
                  </label>
                </div>
              )}

              {draft.profileModalBgMode === "image" && (
                <div className="design-image-field">
                  <div>
                    <span className="design-field-label">팝업 배경 이미지</span>
                    <p>10MB 이하 이미지 파일. 팝업 크기에 맞게 채워집니다.</p>
                  </div>
                  <input ref={modalImageInputRef} className="design-visually-hidden" type="file" accept="image/*" disabled={reading} onChange={e => readImageFile(e, "profileModalBgImage")} />
                  {draft.profileModalBgImage ? (
                    <div className="design-image-preview">
                      <img src={draft.profileModalBgImage} alt="프로필 팝업 배경 미리보기" />
                      <button type="button" disabled={reading} onClick={() => update("profileModalBgImage", "")}>이미지 제거</button>
                    </div>
                  ) : (
                    <button className="design-upload-button" type="button" disabled={reading} onClick={() => modalImageInputRef.current?.click()}>
                      {reading ? "이미지 읽는 중" : "배경 이미지 업로드"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 전체 글자 크기 */}
            <div className="design-subsection">
              <h4>전체 글자</h4>
              <label className="design-field design-range-field">
                <span>
                  사이트 글자 크기 <strong>{draft.fontScale}%</strong>
                </span>
                <input type="range" min="80" max="130" step="5" value={draft.fontScale} onChange={event => update("fontScale", Number(event.target.value))} aria-label="사이트 전체 글자 크기" />
                <div className="design-range-labels">
                  <span>작게</span>
                  <span>기본</span>
                  <span>크게</span>
                </div>
              </label>
            </div>
          </section>

          {error && (
            <p className="design-error" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="design-footer">
          <button className="design-secondary" type="button" onClick={onClose}>취소</button>
          <button className="design-primary" type="submit" disabled={reading}>{reading ? "이미지 읽는 중" : "저장"}</button>
        </div>
      </form>
    </div>
  );
}
