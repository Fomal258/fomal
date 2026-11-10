import { useMemo, useState } from "react";
import { Check, Download, ImageDown, X } from "lucide-react";
import { displayName, type Wrestler } from "@/lib/storage";
import { makeZip } from "@/lib/zip";

type Props = {
  wrestlers: Wrestler[];
  onReplace: (map: Record<string, string>) => void; // 선수 id → photos/파일명
  onClose: () => void;
};

// 브라우저에만 저장된(base64) 사진을 photos 폴더 규칙의 파일로 뽑아내고, 경로로 바꿔 주는 도구
export default function PhotoMigrator({ wrestlers, onReplace, onClose }: Props) {
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

  // 이름 → 파일명 규칙. 중복되면 -2, -3 을 붙입니다.
  const items = useMemo(() => {
    const used = new Set<string>();
    return wrestlers
      .filter(w => w.image.startsWith("data:image/"))
      .map(w => {
        const mime = w.image.slice(5, w.image.indexOf(";")) || "image/jpeg";
        const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : mime.includes("gif") ? "gif" : "jpg";
        const base = displayName(w).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `wrestler-${w.id}`;
        let name = `${base}.${ext}`;
        let index = 2;
        while (used.has(name)) name = `${base}-${index++}.${ext}`;
        used.add(name);
        return { id: w.id, name, dataUrl: w.image, guess: displayName(w) };
      });
  }, [wrestlers]);

  // 사진들을 ZIP으로 내려받기
  const exportZip = async () => {
    if (!items.length) return;
    setStatus("사진을 모으는 중입니다…");
    const entries = [];
    for (const item of items) {
      const response = await fetch(item.dataUrl);
      const buffer = await response.arrayBuffer();
      entries.push({ name: item.name, bytes: new Uint8Array(buffer) });
    }
    const blob = makeZip(entries);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "roster-photos.zip";
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus(`${items.length}장을 roster-photos.zip 으로 내려받았습니다. 압축을 풀어 client/public/photos 에 넣으세요.`);
  };

  // 저장된 사진을 photos/파일명 경로로 치환
  const replacePaths = () => {
    const map: Record<string, string> = {};
    items.forEach(item => (map[item.id] = `photos/${item.name}`));
    onReplace(map);
    setDone(true);
    setStatus(`${items.length}명의 사진을 photos 폴더 경로로 바꿨습니다.`);
  };

  return (
    <div className="editor-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <section className="editor-modal tools-modal" role="dialog" aria-modal="true" aria-labelledby="photo-migrator-title" onMouseDown={event => event.stopPropagation()}>
        <header className="editor-header">
          <h2 id="photo-migrator-title">사진 일괄 이전</h2>
          <button className="editor-secondary" type="button" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </header>

        <div className="editor-body">
          <p className="tools-lead">
            이 브라우저에만 저장된 사진(<strong>{items.length}장</strong>)을 <code>photos/</code> 폴더 규칙의 파일로 뽑아내고,
            저장된 사진을 파일 경로로 바꿉니다. 다른 브라우저에서도 같은 사진이 보이게 됩니다.
          </p>

          <ol className="tools-steps">
            <li>아래 <strong>ZIP으로 내려받기</strong>를 누릅니다.</li>
            <li>압축을 풀어 <code>client/public/photos</code> 폴더에 넣습니다.</li>
            <li><code>npm run photos</code> 실행 (또는 다시 빌드).</li>
            <li>여기로 돌아와 <strong>경로로 바꾸기</strong>를 누릅니다.</li>
          </ol>

          {items.length > 0 && (
            <div className="tools-preview">
              {items.slice(0, 6).map(item => (
                <div className="tools-thumb" key={item.id}>
                  <img src={item.dataUrl} alt="" />
                  <span>{item.name}</span>
                </div>
              ))}
              {items.length > 6 && <span className="tools-more">+{items.length - 6}장</span>}
            </div>
          )}

          {status && (
            <p className="tools-status" role="status">
              {status}
            </p>
          )}

          <div className="editor-actions">
            <button className="editor-secondary" type="button" onClick={exportZip} disabled={!items.length}>
              <Download size={14} /> ZIP으로 내려받기
            </button>
            <span className="editor-actions-spacer" aria-hidden="true" />
            <button className="editor-primary" type="button" onClick={replacePaths} disabled={!items.length || done}>
              {done ? <Check size={14} /> : <ImageDown size={14} />}
              {done ? "경로로 바뀜" : "경로로 바꾸기"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
