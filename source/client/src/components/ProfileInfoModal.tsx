import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Link2, Pencil, X } from "lucide-react";
import { imageOf, probePhoto } from "@/data/photos";
import { cropTransform, displayName, linkLabel, wrestlerLinks, wrestlerNames, type Wrestler } from "@/lib/storage";
import type { SiteDesign } from "@/lib/design";
import { useDialogFocus } from "@/lib/a11y";
import { profileUrl } from "@/lib/urlState";

type Props = {
  wrestler: Wrestler;
  animation: SiteDesign["profileModalAnimation"]; // none | fade | slide | zoom
  duration: number; // 열림/닫힘 시간(ms)
  onClose: () => void;
  onEdit?: () => void;
  kicker?: string; // 상단 작은 제목 (기본: SUPERSTAR PROFILE)
};

const monogramOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "WR";
};

// 선수 이름을 눌렀을 때 열리는 읽기용 정보 팝업 (팝업 크기에 맞춘 4:5 프로필 이미지 자동 최적화 + 빈 소개 문구 미표시)
export default function ProfileInfoModal({ wrestler, animation, duration, onClose, onEdit, kicker = "SUPERSTAR PROFILE" }: Props) {
  const links = wrestlerLinks(wrestler);
  const allNames = wrestlerNames(wrestler);
  const name = displayName(wrestler);
  const subNames = allNames.slice(1).filter(Boolean);
  const bioText = wrestler.bio?.trim() ?? "";
  const monogram = monogramOf(name);
  const directPhoto = imageOf({ image: wrestler.image, names: allNames });
  const [probedPhoto, setProbedPhoto] = useState("");
  const photo = directPhoto || probedPhoto;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo]);
  useEffect(() => {
    if (directPhoto) return;
    let cancelled = false;
    probePhoto(allNames).then(found => {
      if (!cancelled && found) setProbedPhoto(found);
    });
    return () => {
      cancelled = true;
    };
  }, [directPhoto, wrestler.id]);
  const [closing, setClosing] = useState(false); // 닫히는 애니메이션 중
  const [copied, setCopied] = useState(false); // 공유 링크 복사 알림
  const timer = useRef<number | null>(null);
  const modalRef = useRef<HTMLElement | null>(null);
  useDialogFocus(modalRef, !closing);

  // 지금 보고 있는 선수의 공유 주소(?p=)를 클립보드에 복사합니다.
  const copyLink = async () => {
    const link = profileUrl(wrestler);
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt("이 주소를 복사하세요", link);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  // 닫기: 애니메이션이 있으면 끝난 뒤에 실제로 닫습니다.
  const requestClose = useCallback(() => {
    if (closing) return;
    if (animation === "none" || duration <= 0) {
      onClose();
      return;
    }
    setClosing(true);
    timer.current = window.setTimeout(onClose, duration);
  }, [animation, duration, closing, onClose]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  // Esc 로 닫기
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [requestClose]);

  const stateClass = `anim-${animation} ${closing ? "is-closing" : ""}`;
  const style = { "--modal-duration": `${duration}ms` } as React.CSSProperties;
  const hasPhoto = Boolean(photo && !failed);

  return (
    <div
      className={`info-backdrop ${stateClass}`}
      style={style}
      role="presentation"
      onMouseDown={event => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <section
        ref={modalRef}
        className={`info-modal ${stateClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-info-title"
        onMouseDown={event => event.stopPropagation()}
      >
        <header className="info-header">
          <div className="info-header-titles">
            <p className="info-kicker">{kicker}</p>
            <div className="info-header-name-row">
              <h2 id="profile-info-title">{name}</h2>
              {subNames.length > 0 && (
                <span className="info-header-subname">{subNames.join(" · ")}</span>
              )}
            </div>
          </div>
          <button type="button" onClick={requestClose} aria-label="선수 정보 닫기">
            <X size={18} />
          </button>
        </header>

        <div className="info-body info-body-portrait">
          {/* 왼쪽: 팝업 크기에 맞게 자동 최적화된 4:5 세로 프로필 이미지 */}
          <div className="info-portrait-col">
            <div className={`info-image info-image-portrait ${wrestler.favorite ? "is-champ" : ""}`}>
              {hasPhoto ? (
                <>
                  {<span className="card-fill" style={{ backgroundImage: `url("${photo}")` }} />}
                  <div className="info-stage" style={{ transform: cropTransform(wrestler.imageCrop) }}>
                    <img
                      src={photo}
                      alt={`${name} 프로필`}
                      decoding="async"
                      fetchPriority="high"
                      draggable={false}
                      onError={() => setFailed(true)}
                    />
                  </div>
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
                  <span className="silhouette-sub">RING ROSTER SUPERSTAR</span>
                </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 첫 번째 이름 + 옆 서브 이름 + 소개(있을 때만) + 등록 링크 + 액션 버튼 */}
          <div className="info-detail-col">
            <div className="info-copy">
              <div className="info-title-row">
                <h3>{name}</h3>
                {subNames.length > 0 && (
                  <span className="info-subname-inline">{subNames.join(" · ")}</span>
                )}
                {wrestler.favorite && <span className="tc-champ-tag">★ MAIN EVENT</span>}
              </div>
              {bioText && <p className="info-bio-text">{bioText}</p>}
            </div>

            {links.length > 0 && (
              <div className="info-links-block">
                <span className="info-links-label">PROFILE LINKS</span>
                <ul className="info-links">
                  {links.map(link => (
                    <li key={link}>
                      <a href={link} target="_blank" rel="noopener noreferrer">
                        <span>{linkLabel(link)}</span>
                        <em>{link.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</em>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="info-actions">
              <button className="info-link" type="button" onClick={copyLink}>
                {copied ? <Check size={14} /> : <Link2 size={14} />}
                {copied ? "복사됨" : "링크 복사"}
              </button>
              {onEdit && (
                <button className="info-link" type="button" onClick={onEdit}>
                  <Pencil size={14} /> 프로필 수정
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
