import { useEffect, useMemo, useRef, useState } from "react";
import { bundledPhotos, imageOf, photoPath } from "@/data/photos";
import type { HeroBlock, SiteDesign } from "@/lib/design";
import { displayName, wrestlerNames, type Wrestler } from "@/lib/storage";

type StripTile = { key: string; src: string; name: string };

// 시드 기반 피셔-예이츠 셔플 (사이트 접속·새로고침마다 새로운 시드로 각 줄의 프로필 순서가 랜덤 배치됨)
const shuffleWithSeed = <T,>(items: T[], seed: number): T[] => {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// 히어로 블록 한 개를 종류에 맞는 태그로 그립니다.
function Block({ block, align }: { block: HeroBlock; align: SiteDesign["heroAlign"] }) {
  const justify = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";

  if (block.type === "eyebrow") {
    return (
      <div className="hero-eyebrow" style={{ justifyContent: justify }}>
        <span />
        {block.text}
        <span />
      </div>
    );
  }

  // 큰 제목: 마지막 단어만 빨간색(em)으로 강조합니다
  if (block.type === "title") {
    const words = block.text.trim().split(/\s+/);
    const last = words.pop() ?? "";
    return (
      <h1>
        {words.length > 0 && <>{words.join(" ")} </>}
        <em>{last}</em>
      </h1>
    );
  }

  if (block.type === "button") {
    if (!block.url) return null;
    const external = /^https?:\/\//i.test(block.url);
    return (
      <a className="hero-custom-button" href={block.url} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined}>
        {block.text}
      </a>
    );
  }

  return <p>{block.text}</p>;
}

// 첫 화면(히어로) 영역: 접속·새로고침마다 랜덤 순서로 바뀌며 무한 루프로 흐르는 2-A 사선 교차 필름 스트립
export default function Hero({ design, wrestlers = [] }: { design: SiteDesign; wrestlers?: Wrestler[] }) {
  const backgroundImage = design.heroImage ? `linear-gradient(rgba(0,0,0,.62), rgba(0,0,0,.62)), url("${design.heroImage}")` : undefined;
  // 사이트 접속/새로고침마다 고유한 랜덤 시드 생성
  const [mountSeed] = useState(() => Math.floor(Math.random() * 0x7fffffff) || 1);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);

  const strips = useMemo(() => {
    const seen = new Set<string>();
    const pool: StripTile[] = [];

    for (const w of wrestlers) {
      const src = imageOf({ image: w.image, names: wrestlerNames(w) });
      if (src && !seen.has(src)) {
        seen.add(src);
        pool.push({ key: w.id, src, name: displayName(w) });
      }
    }

    for (const file of bundledPhotos) {
      const src = photoPath(file);
      if (!seen.has(src)) {
        seen.add(src);
        const label = file.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        pool.push({ key: file, src, name: label });
      }
    }

    if (pool.length === 0) return [];

    // 1세트 길이가 화면보다 충분히 길도록 최소 14장 이상 확보
    const buildUnit = (list: StripTile[]) => {
      const filled: StripTile[] = [];
      while (filled.length < 14) {
        filled.push(...list);
      }
      return filled;
    };

    // 각 줄마다 서로 다른 시드로 완전 랜덤 셔플하여 접속/새로고침할 때마다 배치가 새롭게 바뀜
    return [
      buildUnit(shuffleWithSeed(pool, mountSeed)),
      buildUnit(shuffleWithSeed(pool, mountSeed ^ 0x9e3779b9)),
      buildUnit(shuffleWithSeed(pool, mountSeed ^ 0x85ebca6b)),
    ];
  }, [wrestlers, mountSeed]);

  const speedScale = (design.heroFilmSpeed ?? 100) / 100;
  const speedRef = useRef(speedScale);
  speedRef.current = speedScale;

  // OS의 '애니메이션 줄이기(prefers-reduced-motion)' 설정과 무관하게 항상 매끄럽게 무한 루프가 돌도록 requestAnimationFrame으로 직접 구동
  useEffect(() => {
    if (design.heroImage || strips.length === 0) return;
    let rafId = 0;
    let lastTime = performance.now();
    // 각 줄의 현재 진행률 (0 ~ 50%) 및 기본 방향/속도(% per second) — 100% 기준 [-0.35, 0.3, -0.4]
    const offsets = [0, -50, 0];
    const baseSpeeds = [-0.35, 0.3, -0.4]; // 1·3번째 줄은 왼쪽(-), 2번째 줄은 오른쪽(+)으로 이동

    const step = (now: number) => {
      const dt = Math.min(0.06, (now - lastTime) / 1000);
      lastTime = now;
      const mult = speedRef.current;

      for (let i = 0; i < 3; i++) {
        const el = trackRefs.current[i];
        if (!el) continue;
        const spd = baseSpeeds[i] * mult;
        offsets[i] += spd * dt;
        if (spd < 0 && offsets[i] <= -50) {
          offsets[i] += 50;
        } else if (spd > 0 && offsets[i] >= 0) {
          offsets[i] -= 50;
        }
        el.style.transform = `translate3d(${offsets[i].toFixed(4)}%, 0, 0)`;
      }
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [design.heroImage, strips]);

  return (
    <section
      className="hero hero-has-strips"
      aria-label="메인 영역"
      style={{ backgroundColor: design.heroBg, backgroundImage, backgroundPosition: "center", backgroundSize: "cover" }}
    >
      {/* 2-A. 사선(Diagonal) 교차 필름 스트립 배경 (새로고침마다 랜덤 셔플 + 끊김 없는 무한 루프) */}
      {!design.heroImage && strips.length > 0 && (
        <div className="hero-film-stage" aria-hidden="true">
          <div className="hero-film-plane">
            {strips.map((unit, rIdx) => (
              <div key={rIdx} className={`hero-film-row ${rIdx % 2 === 1 ? "is-reverse" : ""} row-${rIdx + 1}`}>
                <div
                  className="hero-film-track"
                  ref={node => {
                    trackRefs.current[rIdx] = node;
                  }}
                >
                  {[0, 1].map(copyIdx => (
                    <div key={copyIdx} className="hero-film-group">
                      {unit.map((tile, tIdx) => (
                        <div key={`${tile.key}-${copyIdx}-${tIdx}`} className="hero-film-frame">
                          <img src={tile.src} alt="" loading="eager" decoding="async" />
                          <span className="hero-film-caption">{tile.name}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="hero-film-vignette" />
        </div>
      )}

      <div className="hero-line hero-line-left" />
      <div className="hero-line hero-line-right" />
      <div className="hero-content" style={{ textAlign: design.heroAlign }}>
        {design.heroBlocks.map(block => (
          <Block key={block.id} block={block} align={design.heroAlign} />
        ))}
      </div>
    </section>
  );
}
