import { useState } from "react";

type Props = {
  title: string; // 화면 제목 (이름 / 링크)
  hint?: string; // 제목 옆 회색 안내
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  type?: "text" | "url";
  emptyText?: string; // 항목이 없을 때 안내
};

// 여러 줄 입력 목록. 드래그 앤 드롭 또는 ↑↓ 로 순서를 바꾸고, 줄을 추가/삭제합니다.
// 프로필의 "이름"과 "링크"가 같은 컴포넌트를 씁니다.
export default function ListRows({ title, hint, items, onChange, placeholder, addLabel, type = "text", emptyText }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const id = `list-${title}`;
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };
  const reset = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="editor-field">
      <label id={`${id}-label`}>
        {title}
        {hint && <small className="editor-hint">{hint}</small>}
      </label>

      <div className="row-list" role="group" aria-labelledby={`${id}-label`}>
        {items.map((value, index) => (
          <div
            key={index}
            className={`row-item ${dragIndex === index ? "is-dragging" : ""} ${overIndex === index && dragIndex !== index ? "is-over" : ""}`}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={event => {
              event.preventDefault();
              setOverIndex(index);
            }}
            onDrop={event => {
              event.preventDefault();
              if (dragIndex !== null && dragIndex !== index) move(dragIndex, index);
              reset();
            }}
            onDragEnd={reset}
          >
            <span className="row-drag" aria-hidden="true">
              ⠿
            </span>
            <input
              aria-label={`${title} ${index + 1}`}
              type={type}
              value={value}
              placeholder={placeholder}
              onChange={event => onChange(items.map((item, i) => (i === index ? event.target.value : item)))}
            />
            <div className="row-actions">
              <button type="button" aria-label={`${title} ${index + 1} 위로 이동`} disabled={index === 0} onClick={() => move(index, index - 1)}>
                ↑
              </button>
              <button type="button" aria-label={`${title} ${index + 1} 아래로 이동`} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                ↓
              </button>
              <button type="button" className="row-remove" aria-label={`${title} ${index + 1} 삭제`} onClick={() => onChange(links(index))}>
                ×
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && emptyText && <p className="row-empty">{emptyText}</p>}
      </div>

      <button type="button" className="row-add" onClick={() => onChange([...items, ""])}>
        {addLabel}
      </button>
    </div>
  );

  // 해당 줄만 제거한 배열
  function links(index: number) {
    return items.filter((_, i) => i !== index);
  }
}
