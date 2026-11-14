import { useEffect, useRef, useState } from "react";
import type { ImageCrop } from "@/lib/storage";

type Props = {
  src: string;
  crop: ImageCrop;
  onChange: (crop: ImageCrop) => void;
};

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 3.5;
const MAX_PAN = 120; // 사진 크기와 상관없이 언제든 상하좌우 ±120%까지 자유롭게 이동 가능
const SNAP = 2; // 자석 맞춤이 켜져 있을 때만 0% 근처에서 스냅

// 프로필 사진 위치·크기 자유 조절기 (100% 배율에서도 즉시 드래그 가능 + 마우스 휠 줌 시 모달 스크롤 완전 차단 + X/Y 슬라이더 + 원클릭 위치 프리셋)
export default function ImageCropper({ src, crop, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origin: ImageCrop } | null>(null);
  const wheelHandlerRef = useRef<((event: WheelEvent) => void) | null>(null);
  const [dragging, setDragging] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(false); // 기본은 자석 걸림 없이 부드러운 자유 이동

  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom || 1));
  const snapTo = (value: number) => (Math.abs(value) <= SNAP ? 0 : value);
  const clampPan = (value: number) => Math.min(MAX_PAN, Math.max(-MAX_PAN, Math.round(value * 10) / 10));

  // 크기를 바꿔도 기존에 맞춰둔 x, y 위치가 초기화되지 않고 그대로 유지됩니다.
  const update = (next: Partial<ImageCrop>, { snap = snapEnabled }: { snap?: boolean } = {}) => {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((next.zoom ?? zoom) * 100) / 100));
    const rawX = next.x ?? crop.x;
    const rawY = next.y ?? crop.y;
    onChange({
      zoom: nextZoom,
      x: clampPan(snap ? snapTo(rawX) : rawX),
      y: clampPan(snap ? snapTo(rawY) : rawY),
    });
  };

  // 사진 위에서 마우스 휠을 굴릴 때 모달 스크롤이 함께 움직이지 않도록 non-passive 네이티브 이벤트로 제어
  wheelHandlerRef.current = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY < 0 ? 0.08 : -0.08;
    update({ zoom: zoom + delta }, { snap: false });
  };

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onNativeWheel = (event: WheelEvent) => {
      wheelHandlerRef.current?.(event);
    };
    el.addEventListener("wheel", onNativeWheel, { passive: false });
    return () => el.removeEventListener("wheel", onNativeWheel);
  }, []);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startX: event.clientX, startY: event.clientY, origin: crop };
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const box = boxRef.current;
    if (!drag || !box) return;
    update({
      x: drag.origin.x + ((event.clientX - drag.startX) / box.clientWidth) * 100,
      y: drag.origin.y + ((event.clientY - drag.startY) / box.clientHeight) * 100,
    });
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  // 방향키: 1%씩 이동 (Shift 를 누르면 5%씩 빠른 이동)
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const arrows = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
    if (!arrows.includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    const next =
      event.key === "ArrowLeft"
        ? { x: crop.x - step }
        : event.key === "ArrowRight"
          ? { x: crop.x + step }
          : event.key === "ArrowUp"
            ? { y: crop.y - step }
            : { y: crop.y + step };
    update(next, { snap: false });
  };

  const snappedX = snapEnabled && crop.x === 0;
  const snappedY = snapEnabled && crop.y === 0;

  return (
    <div className="crop">
      <div
        ref={boxRef}
        className={`crop-box ${dragging ? "is-dragging" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={() => onChange({ x: 0, y: 0, zoom: 1 })}
        onKeyDown={onKeyDown}
        tabIndex={0}
        role="application"
        aria-label="사진 위치 자유 조절. 마우스로 드래그하거나 휠로 확대/축소하고, 아래 슬라이더로 미세 조절할 수 있습니다."
      >
        <span className="crop-fill" style={{ backgroundImage: `url("${src}")` }} />
        <div className={`crop-stage ${zoom < 1 ? "is-shrunk" : ""}`} style={{ transform: `translate(${crop.x}%, ${crop.y}%) scale(${zoom})` }}>
          <img src={src} alt="프로필 사진 미리보기" draggable={false} />
        </div>

        {/* 3x3 구도 가이드 그리드 (드래그 중이거나 자석 맞춤일 때 표시) */}
        <span className={`crop-grid-overlay ${dragging ? "is-active" : ""}`} aria-hidden="true" />
        {snappedX && <span className="crop-guide crop-guide-v" />}
        {snappedY && <span className="crop-guide crop-guide-h" />}
        <span className="crop-coords" aria-hidden="true">
          X {Math.round(crop.x)}% · Y {Math.round(crop.y)}% · {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* 빠른 위치 프리셋 버튼 + 자석 맞춤 토글 */}
      <div className="crop-presets">
        <button type="button" className="crop-preset-btn" onClick={() => update({ x: 0, y: 18 }, { snap: false })} title="얼굴이 위쪽에 있을 때 아래로 내려 맞춤">
          상단(얼굴) 맞춤
        </button>
        <button type="button" className="crop-preset-btn" onClick={() => update({ x: 0, y: 0 }, { snap: false })}>
          정중앙
        </button>
        <button type="button" className="crop-preset-btn" onClick={() => update({ x: 0, y: -18 }, { snap: false })}>
          하단 맞춤
        </button>
        <button type="button" className="crop-preset-btn" onClick={() => onChange({ x: 0, y: 0, zoom: 1 })}>
          초기화
        </button>
        <label className="crop-snap-toggle" title="가운데(0%) 근처에서 자동으로 딱 붙게 할지 선택">
          <input type="checkbox" checked={snapEnabled} onChange={e => setSnapEnabled(e.target.checked)} />
          <span>중앙 자석</span>
        </label>
      </div>

      {/* 크기(Zoom) + 가로(X) + 세로(Y) 미세 조절 슬라이더 */}
      <div className="crop-sliders">
        <label className="crop-zoom">
          <span>크기</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step="0.02"
            value={zoom}
            onChange={event => update({ zoom: Number(event.target.value) }, { snap: false })}
            aria-label="사진 크기"
          />
          <strong>{Math.round(zoom * 100)}%</strong>
        </label>
        <label className="crop-zoom">
          <span>가로 이동 (X)</span>
          <input
            type="range"
            min={-MAX_PAN}
            max={MAX_PAN}
            step="1"
            value={crop.x}
            onChange={event => update({ x: Number(event.target.value) }, { snap: false })}
            aria-label="사진 가로 위치"
          />
          <strong>{Math.round(crop.x)}%</strong>
        </label>
        <label className="crop-zoom">
          <span>세로 이동 (Y)</span>
          <input
            type="range"
            min={-MAX_PAN}
            max={MAX_PAN}
            step="1"
            value={crop.y}
            onChange={event => update({ y: Number(event.target.value) }, { snap: false })}
            aria-label="사진 세로 위치"
          />
          <strong>{Math.round(crop.y)}%</strong>
        </label>
      </div>

      <p className="crop-hint">
        사진을 <strong>마우스로 직접 드래그</strong>해 원하는 위치에 놓거나, <strong>마우스 휠</strong>로 크기를 조절하세요. (더블클릭 시 초기화)
      </p>
    </div>
  );
}
