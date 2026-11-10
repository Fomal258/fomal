import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Save, X } from "lucide-react";
import { findPhotoFile, getPhotoRules, resetPhotoRules, savePhotoRules, type PhotoRules } from "@/lib/photoRules";
import { displayName, wrestlerNames, type Wrestler } from "@/lib/storage";

type Props = {
  wrestlers: Wrestler[];
  onClose: () => void;
};

const SEPARATOR_OPTIONS = [
  { value: "-", label: "하이픈 -" },
  { value: "_", label: "언더스코어 _" },
  { value: " ", label: "공백" },
  { value: ".", label: "마침표 ." },
];

// 사진 자동 매칭 규칙 설정 (브라우저에만 저장)
export default function PhotoRulesModal({ wrestlers, onClose }: Props) {
  const [draft, setDraft] = useState<PhotoRules>(() => ({ ...getPhotoRules() }));
  const [files, setFiles] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}photos/index.json`)
      .then(response => (response.ok ? response.json() : []))
      .then((list: unknown) => Array.isArray(list) && setFiles(list.filter((item): item is string => typeof item === "string")))
      .catch(() => undefined);
  }, []);

  const toggleSeparator = (value: string) =>
    setDraft(current => ({
      ...current,
      separators: current.separators.includes(value) ? current.separators.filter(item => item !== value) : [...current.separators, value],
    }));

  // 미리보기: 파일 → 매칭되는 선수
  const preview = useMemo(() => {
    return files.slice(0, 8).map(file => {
      const owner = wrestlers.find(w => findPhotoFile(displayName(w), [file], draft) === file);
      return { file, name: owner ? displayName(owner) : "" };
    });
  }, [files, wrestlers, draft]);

  const matchedCount = useMemo(
    () => wrestlers.filter(w => wrestlerNames(w).some(name => files.some(file => findPhotoFile(name, [file], draft) === file))).length,
    [wrestlers, files, draft]
  );

  const save = () => {
    savePhotoRules(draft);
    setSaved(true);
    onClose();
  };

  return (
    <div className="editor-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="editor-modal rules-modal" role="dialog" aria-modal="true" aria-labelledby="photo-rules-title" onMouseDown={event => event.stopPropagation()}>
        <header className="editor-header">
          <h2 id="photo-rules-title">사진 매칭 규칙</h2>
          <button className="editor-secondary" type="button" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </header>

        <div className="editor-body">
          <p className="tools-lead">
            파일명과 선수 이름을 어떻게 연결할지 정합니다. <strong>이 브라우저에만 저장</strong>되며, 저장하면 목록이 바로 다시 계산됩니다.
          </p>

          <div className="rules-group">
            <h3>매칭 방식</h3>
            <label className="rules-check">
              <input type="checkbox" checked={draft.usePrefix} onChange={event => setDraft({ ...draft, usePrefix: event.target.checked })} />
              <span>이름으로 시작하는 파일도 연결 (접두어 매칭)</span>
              <input
                className="rules-number"
                type="number"
                min={1}
                max={40}
                value={draft.prefixMinLength}
                disabled={!draft.usePrefix}
                onChange={event => setDraft({ ...draft, prefixMinLength: Number(event.target.value) })}
                aria-label="접두어 매칭 최소 이름 길이"
              />
              <em>자 이상</em>
            </label>

            <label className="rules-check">
              <input type="checkbox" checked={draft.useContains} onChange={event => setDraft({ ...draft, useContains: event.target.checked })} />
              <span>이름이 중간에 들어 있어도 연결 (부분 매칭)</span>
              <input
                className="rules-number"
                type="number"
                min={1}
                max={40}
                value={draft.containsMinLength}
                disabled={!draft.useContains}
                onChange={event => setDraft({ ...draft, containsMinLength: Number(event.target.value) })}
                aria-label="부분 매칭 최소 이름 길이"
              />
              <em>자 이상</em>
            </label>
          </div>

          <div className="rules-group">
            <h3>구분자</h3>
            <p className="rules-help">파일명에서 단어를 나누는 문자입니다. 선택하지 않은 문자는 이름의 일부로 취급됩니다.</p>
            <div className="rules-chips">
              {SEPARATOR_OPTIONS.map(option => (
                <label key={option.value} className={`rules-chip ${draft.separators.includes(option.value) ? "is-on" : ""}`}>
                  <input type="checkbox" checked={draft.separators.includes(option.value)} onChange={() => toggleSeparator(option.value)} aria-label={option.label} />
                  <span>{option.label}</span>
                </label>
              ))}
            </div>
            <input
              className="rules-text"
              value={draft.separators.filter(item => !SEPARATOR_OPTIONS.some(option => option.value === item)).join(" ")}
              onChange={event => {
                const extras = event.target.value.split(/[\s,]+/).filter(Boolean).slice(0, 6);
                const fixed = draft.separators.filter(item => SEPARATOR_OPTIONS.some(option => option.value === item));
                setDraft({ ...draft, separators: [...fixed, ...extras] });
              }}
              placeholder="추가 구분자 (예:  ,  ·)"
              aria-label="추가 구분자"
            />
          </div>

          <div className="rules-group">
            <h3>무시할 접두어</h3>
            <p className="rules-help">파일명 앞에 붙는 단어입니다. 이 단어들은 매칭에서 빼고 비교합니다.</p>
            <input
              className="rules-text"
              value={draft.ignoredPrefixes.join(", ")}
              onChange={event => setDraft({ ...draft, ignoredPrefixes: event.target.value.split(",").map(item => item.trim()).filter(Boolean) })}
              placeholder="img, photo, wwe"
              aria-label="무시할 접두어 목록"
            />
          </div>

          {files.length > 0 && (
            <div className="rules-group">
              <h3>미리보기</h3>
              <p className="rules-help">
                현재 규칙으로 <strong>{matchedCount}명</strong>이 사진과 연결됩니다. (파일 {files.length}개)
              </p>
              <ul className="rules-preview">
                {preview.map(row => (
                  <li key={row.file}>
                    <code>{row.file}</code>
                    <span className={row.name ? "" : "is-empty"}>{row.name || "매칭 없음"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="editor-actions">
            <button
              className="editor-secondary"
              type="button"
              onClick={() => {
                resetPhotoRules();
                setDraft({ ...getPhotoRules() });
              }}
            >
              <RotateCcw size={14} /> 기본값으로
            </button>
            <span className="editor-actions-spacer" aria-hidden="true" />
            <button className="editor-secondary" type="button" onClick={onClose}>
              취소
            </button>
            <button className="editor-primary" type="button" onClick={save} disabled={saved}>
              <Save size={14} /> 저장
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
