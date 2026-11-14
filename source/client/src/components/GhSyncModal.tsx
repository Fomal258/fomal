import { useEffect, useState, type FormEvent } from "react";
import { detectRepoFromLocation, type GhConfig } from "@/lib/githubSync";

type Props = {
  config: GhConfig;
  onSave: (next: GhConfig) => void;
  onSyncNow: (next: GhConfig) => Promise<void>;
  onClose: () => void;
};

// 깃허브 자동 저장 설정 모달
export default function GhSyncModal({ config, onSave, onSyncNow, onClose }: Props) {
  const [owner, setOwner] = useState(config.owner);
  const [repo, setRepo] = useState(config.repo);
  const [branch, setBranch] = useState(config.branch || "main");
  const [path, setPath] = useState(config.path || "roster-data.json");
  const [token, setToken] = useState(config.token);
  const [autoSync, setAutoSync] = useState(config.autoSync !== false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const build = (): GhConfig => ({ owner: owner.trim(), repo: repo.trim(), branch: branch.trim() || "main", path: path.trim() || "roster-data.json", token: token.trim(), autoSync });

  const detect = () => {
    const g = detectRepoFromLocation();
    if (!g.owner || !g.repo) { setFeedback("현재 주소에서는 저장소를 감지하지 못했습니다. 직접 입력해 주세요."); return; }
    setOwner(g.owner); setRepo(g.repo);
    setFeedback(`감지 완료: ${g.owner} / ${g.repo}`);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next = build();
    onSave(next);
    if (!next.owner || !next.repo || !next.token) { setFeedback("설정이 저장되었습니다. 토큰을 입력하면 즉시 동기화가 켜집니다."); return; }
    setBusy(true);
    setFeedback("깃허브에 현재 로스터를 저장하는 중...");
    try {
      await onSyncNow(next);
      setFeedback("저장 완료. 이제 수정할 때마다 자동으로 커밋됩니다.");
    } catch (err) {
      setFeedback(`오류: ${(err as Error)?.message || "동기화에 실패했습니다."}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form className="editor-modal gh-sync-modal" onSubmit={submit} onMouseDown={e => e.stopPropagation()}>
        <header className="editor-header">
          <div>
            <p className="editor-kicker">GITHUB DIRECT AUTO-SYNC</p>
            <h3>깃허브 실시간 자동 저장 설정</h3>
          </div>
          <button type="button" className="editor-secondary" onClick={onClose} aria-label="닫기">✕</button>
        </header>

        <div className="editor-body">
          <div className="gh-sync-guide">
            <strong>한 번만 설정하면 모든 기기가 같은 명단을 봅니다.</strong>
            <ol>
              <li>깃허브 → Settings → Developer settings → Personal access tokens 에서 토큰을 만듭니다.</li>
              <li>권한은 <b>repo</b> 또는 <b>Contents: Read and write</b> 만 주면 됩니다.</li>
              <li>아래에 저장소 정보와 토큰을 넣고 [저장 및 지금 동기화]를 누르면 이후 자동으로 커밋됩니다.</li>
            </ol>
          </div>

          <div className="gh-sync-grid">
            <label className="editor-field"><span>GitHub 아이디 (Owner)</span>
              <input value={owner} onChange={e => setOwner(e.target.value)} placeholder="예: my-github-id" required />
            </label>
            <label className="editor-field"><span>저장소 이름 (Repository)</span>
              <input value={repo} onChange={e => setRepo(e.target.value)} placeholder="예: ring-roster" required />
            </label>
          </div>

          <div className="gh-sync-grid">
            <label className="editor-field"><span>브랜치 (Branch)</span>
              <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="main" />
            </label>
            <label className="editor-field"><span>데이터 파일 경로 (Path)</span>
              <input value={path} onChange={e => setPath(e.target.value)} placeholder="roster-data.json" />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -4 }}>
            <button type="button" className="editor-secondary" style={{ fontSize: 11, padding: "4px 9px" }} onClick={detect}>
              현재 접속 주소에서 저장소 자동 감지
            </button>
          </div>

          <label className="editor-field">
            <span>GitHub Personal Access Token (브라우저에만 보관)</span>
            <input type="password" value={token} onChange={e => setToken(e.target.value)} placeholder="ghp_... 또는 github_pat_..." />
          </label>

          <label className="gh-sync-check">
            <input type="checkbox" checked={autoSync} onChange={e => setAutoSync(e.target.checked)} />
            변경할 때마다 자동으로 깃허브에 저장
          </label>

          {feedback && <div className="gh-sync-feedback">{feedback}</div>}

          <div className="editor-actions">
            <button type="submit" className="editor-primary" disabled={busy}>{busy ? "저장 중..." : "설정 저장 및 지금 동기화"}</button>
            <button type="button" className="editor-secondary" onClick={onClose}>닫기</button>
          </div>
        </div>
      </form>
    </div>
  );
}
