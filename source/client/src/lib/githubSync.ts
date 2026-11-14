// GitHub 직접 동기화: roster-data.json을 읽어오고, 변경 시 커밋합니다.
// 토큰은 브라우저(localStorage)에만 저장되고 서버로 전송되지 않습니다.
import type { RosterState } from "@/lib/storage";

export type GhConfig = {
  owner: string;
  repo: string;
  branch: string;
  path: string;
  token: string;
  autoSync: boolean;
};

export const emptyGhConfig: GhConfig = { owner: "", repo: "", branch: "main", path: "roster-data.json", token: "", autoSync: true };

const CFG_KEY = "ring-roster-gh-config-v1";

export function loadGhConfig(): GhConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY);
    if (!raw) return { ...emptyGhConfig };
    const parsed = JSON.parse(raw) as Partial<GhConfig>;
    return {
      owner: cfg(parsed.owner), repo: cfg(parsed.repo), branch: cfg(parsed.branch) || "main",
      path: cfg(parsed.path) || "roster-data.json", token: cfg(parsed.token), autoSync: parsed.autoSync !== false,
    } as GhConfig;
  } catch {
    return { ...emptyGhConfig };
  }
}

function cfg(v?: string) { return typeof v === "string" ? v.trim() : ""; }

export function saveGhConfig(next: GhConfig) {
  try { localStorage.setItem(CFG_KEY, JSON.stringify(next)); } catch {}
}

export function isConfigured(c: GhConfig) { return Boolean(c.owner && c.repo && c.token); }

// 상태 서명: 찜·유망주·이름·사진 변경을 감지합니다.
export function sigOf(state: RosterState): string {
  const parts = (state.wrestlers || []).map(w =>
    [w.id, w.favorite ? 1 : 0, w.prospect ? 1 : 0, (w.names || []).join("|"), (w.image || "").length, w.createdAt ?? 0].join(":")
  );
  parts.push("c" + (state.columns ?? 0), "s" + (state.sortOrder ?? ""));
  const text = parts.join(";");
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + "-" + text.length.toString(36);
}

export function detectRepoFromLocation(): { owner: string; repo: string } {
  const host = location.hostname;
  const parts = location.pathname.split("/").filter(Boolean);
  if (/\.github\.io$/i.test(host)) {
    return { owner: host.replace(/\.github\.io$/i, ""), repo: parts[0] || "" };
  }
  if (/github\.com$/i.test(host)) {
    return { owner: parts[0] || "", repo: (parts[1] || "").replace(/\.git$/, "") };
  }
  return { owner: "", repo: "" };
}

function apiUrl(c: GhConfig) {
  return `https://api.github.com/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${encodeURIComponent(c.path)}`;
}

// 토큰이 있으면 API로, 없으면 공개 파일로 읽습니다.
export async function fetchRemote(c: GhConfig): Promise<RosterState | null> {
  if (c.owner && c.repo && c.token) {
    try {
      const res = await fetch(`${apiUrl(c)}?ref=${encodeURIComponent(c.branch || "main")}&t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json" },
        cache: "no-store",
      });
      if (res.ok) {
        const j = await res.json();
        if (j && j.content) {
          const decoded = decodeURIComponent(escape(atob(String(j.content).replace(/\s/g, ""))));
          const parsed = JSON.parse(decoded);
          if (Array.isArray(parsed.wrestlers)) return parsed as RosterState;
        }
      }
    } catch {}
  }
  try {
    const res = await fetch(`${c.path || "roster-data.json"}?t=${Date.now()}`, { cache: "no-store" });
    if (res.ok) {
      const parsed = await res.json();
      if (Array.isArray(parsed.wrestlers)) return parsed as RosterState;
    }
  } catch {}
  return null;
}

// 현재 상태를 roster-data.json 으로 커밋합니다.
export async function pushRemote(c: GhConfig, state: RosterState, message: string): Promise<void> {
  if (!isConfigured(c)) throw new Error("깃허브 설정(아이디·저장소·토큰)이 필요합니다.");
  const headers = { Authorization: `Bearer ${c.token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" };

  const shaRes = await fetch(`${apiUrl(c)}?ref=${encodeURIComponent(c.branch || "main")}&t=${Date.now()}`, { headers, cache: "no-store" });
  let sha: string | undefined;
  if (shaRes.ok) {
    const meta = await shaRes.json();
    sha = meta.sha;
  } else if (shaRes.status !== 404) {
    throw new Error(`저장소 조회 실패 (HTTP ${shaRes.status})`);
  }

  const payload = {
    message,
    branch: c.branch || "main",
    content: btoa(unescape(encodeURIComponent(JSON.stringify(state)))),
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(apiUrl(c), { method: "PUT", headers, body: JSON.stringify(payload) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`커밋 실패 (HTTP ${res.status}) ${text.slice(0, 120)}`);
  }
}

export function downloadBackup(state: RosterState) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "roster-data.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
