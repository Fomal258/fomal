// 로스터 저장/불러오기.
// 원본은 서버를 거쳐 구글 드라이브에 저장했지만, 이 버전은 브라우저(IndexedDB)에 저장합니다.
// → 새로고침해도 편집한 내용이 유지되지만, 다른 사람 컴퓨터와는 공유되지 않습니다.

export type ImageCrop = { x: number; y: number; zoom: number };

export type Wrestler = {
  id: string;
  names: string[]; // 이름 목록 (첫 번째가 화면에 보이는 이름)
  image: string; // 사진 주소 또는 data URL
  links?: string[]; // 프로필 링크 주소들 (배열 순서가 곧 표시 순서)
  url?: string; // 예전 데이터 호환용 (단일 링크)
  bio?: string; // 프로필 팝업에 보이는 소개
  favorite?: boolean; // 찜 여부
  prospect?: boolean; // 유망주 여부 (01번 플래티넘 코발트 타종 벨)
  createdAt?: number; // 등록 시각 (최신순/오래된순 정렬에 사용)
  imageCrop?: ImageCrop; // 사진 위치(%), 크기 배율
};

// 선수의 링크 주소 목록. 예전 데이터(url 하나, {label,url} 배열)도 읽을 수 있게 변환합니다.
// 사진 크롭 기본값 (가운데 · 원본 크기)
export const defaultCrop = { x: 0, y: 0, zoom: 1 };

// 카드/팝업에서 사진에 적용할 transform 문자열
export const cropTransform = (crop?: ImageCrop) =>
  crop ? `translate(${crop.x}%, ${crop.y}%) scale(${crop.zoom})` : undefined;

// 이름 목록. 예전 데이터(name 하나)도 읽을 수 있게 변환합니다.
export const wrestlerNames = (wrestler: Wrestler): string[] => {
  if (Array.isArray(wrestler.names) && wrestler.names.length) return wrestler.names;
  const legacy = (wrestler as { name?: string }).name;
  return legacy ? [legacy] : [];
};

// 화면에 보여줄 이름 = 목록의 첫 번째
export const displayName = (wrestler: Wrestler) => wrestlerNames(wrestler)[0] ?? "이름 없음";

export const wrestlerLinks = (wrestler: Wrestler): string[] => {
  const raw = (wrestler.links ?? (wrestler.url ? [wrestler.url] : [])) as unknown[];
  return raw
    .map(item => (typeof item === "string" ? item : (item as { url?: string })?.url ?? ""))
    .filter(Boolean);
};

// 주소에서 보기 좋은 이름 만들기: https://www.instagram.com/x → Instagram
const knownHosts: Record<string, string> = {
  youtube: "YouTube", instagram: "Instagram", x: "X", twitter: "X",
  tiktok: "TikTok", twitch: "Twitch", facebook: "Facebook", threads: "Threads",
};
export const linkLabel = (url: string) => {
  try {
    const name = new URL(url).hostname.replace(/^www\./, "").split(".")[0].toLowerCase();
    return knownHosts[name] ?? name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return "링크";
  }
};

export type SortOrder = "default" | "newest" | "oldest" | "asc" | "desc" | "favorites" | "prospects" | "random";

export type RosterState = {
  wrestlers: Wrestler[];
  columns: number; // 한 줄에 보여줄 카드 수 (3~9)
  sortOrder: SortOrder;
  design?: unknown; // 디자인 설정 (design.ts의 SiteDesign)
  sites?: unknown; // 외부 사이트 링크 목록 (sites.ts의 SiteItem[])
  siteCategories?: unknown; // 외부 사이트 카테고리 탭 목록 (sites.ts의 SiteCategoryItem[])
  sourceVersion?: string; // 명단 버전
};

const DB_NAME = "ring-roster"; // 브라우저 저장소 이름
const STORE = "state"; // 저장소 안의 공간 이름
const KEY = "roster"; // 저장 키

// IndexedDB 열기 (사진이 들어가도 용량 걱정이 적습니다)
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 저장된 로스터 불러오기 (없으면 null)
export async function loadRoster(): Promise<RosterState | null> {
  const db = await openDB();
  return new Promise(resolve => {
    const request = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    request.onsuccess = () => {
      db.close();
      resolve((request.result as RosterState | undefined) ?? null);
    };
    request.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

// 로스터 저장하기 (전체를 통째로 저장합니다)
export async function saveRoster(state: RosterState): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("저장에 실패했습니다."));
    };
  });
}

// 고른 사진을 최대 800px JPEG(품질 0.85)로 줄여 data URL 로 돌려줍니다. (원본은 구글 드라이브 업로드)
export async function uploadRosterImage(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("사진을 읽지 못했습니다."));
    img.src = dataUrl;
  });
  const scale = Math.min(1, 800 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}
