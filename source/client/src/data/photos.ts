// photos 폴더 파일을 선수 이름과 자동 연결합니다.
// 빌드 시점의 index.json 목록뿐만 아니라, 나중에 photos/ 폴더에 선수 이름과 같은 파일명을 넣어도
// 새로고침 즉시 자동으로 찾아서 카드·프로필 팝업·편집창에 바로 연동합니다.

import files from "../../public/photos/index.json";

const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const IGNORED_PREFIXES = new Set(["img", "image", "photo", "pic", "screenshot", "kakao", "download", "wwe"]);

// 파일명/이름을 구분자(-, _, 공백)로 나눠 단어 목록으로 만듭니다.
const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(EXT, "")
    .split(/[-_\s]+/)
    .map(part => part.replace(/[^a-z0-9가-힣]/g, ""))
    .filter(Boolean);

const stripIgnoredPrefixes = (tokens: string[]) => {
  let index = 0;
  while (index < tokens.length && IGNORED_PREFIXES.has(tokens[index])) index += 1;
  return tokens.slice(index);
};

const startsWithTokens = (tokens: string[], prefix: string[]) =>
  prefix.every((token, index) => tokens[index] === token);

const containsTokens = (tokens: string[], needle: string[]) => {
  for (let start = 0; start <= tokens.length - needle.length; start += 1) {
    if (needle.every((token, offset) => tokens[start + offset] === token)) return true;
  }
  return false;
};

// 이름 하나에 해당하는 파일을 규칙(정확히 일치 → 접두어 → 부분 포함)에 따라 찾습니다.
export function findPhotoFile(name: string, fileList: string[]): string {
  const nameTokens = tokenize(name);
  if (!nameTokens.length) return "";
  const nameKey = nameTokens.join("-");

  const candidates: { file: string; rank: number; size: number }[] = [];

  fileList.forEach(file => {
    const tokens = stripIgnoredPrefixes(tokenize(file));
    if (!tokens.length) return;

    if (tokens.join("-") === nameKey) {
      candidates.push({ file, rank: 0, size: tokens.length });
      return;
    }
    if (nameKey.length >= 3 && startsWithTokens(tokens, nameTokens)) {
      candidates.push({ file, rank: 1, size: tokens.length });
      return;
    }
    if (nameKey.length >= 6 && containsTokens(tokens, nameTokens)) {
      candidates.push({ file, rank: 2, size: tokens.length });
    }
  });

  candidates.sort((a, b) => a.rank - b.rank || a.size - b.size || a.file.localeCompare(b.file, "en"));
  return candidates[0]?.file ?? "";
}

export const slugifyName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[.']/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-|-$/g, "");

export const photoPath = (file: string) => `photos/${encodeURI(file)}`;

// 빌드 시점에 포함된 사진 목록 (file:// 에서도 fetch 없이 사용 가능)
export const bundledPhotos = files as string[];

// 런타임에 새로 발견된 사진 캐시 (이름 키 → 찾은 경로 또는 "")
const probedCache = new Map<string, string>();
const inflightProbes = new Map<string, Promise<string>>();

// 이름들 중 index.json 또는 런타임 캐시에 사진이 있는 첫 이름으로 경로를 찾습니다.
export const photoFor = (names: string[]): string => {
  for (const name of names) {
    const file = findPhotoFile(name, bundledPhotos);
    if (file) return photoPath(file);
  }
  const cacheKey = names.map(n => n.trim()).filter(Boolean).join("|");
  if (cacheKey && probedCache.has(cacheKey)) {
    return probedCache.get(cacheKey) ?? "";
  }
  return "";
};

// 호환성을 위해 남겨두되, 항상 false를 반환하여 index.json에 없는 선수도 언제든 photos/ 폴더를 직접 탐색하게 합니다.
export const hasPhotoIndex = true; // 페이지 로드 시 수천 건의 404 이미지 요청(GitHub Pages Rate Limit) 방지

// 선수 이름(예: "Alex Shelley")으로 가능한 파일명 후보들을 순서대로 생성합니다.
// - "Alex Shelley.jpg" (원래 이름 그대로)
// - "alex-shelley.jpg" (소문자 하이픈)
// - "alex shelley.jpg" (소문자 공백)
// - "Alex_Shelley.jpg" / "alex_shelley.jpg" (언더바)
function buildCandidatePaths(names: string[], extensions: string[]): string[] {
  const bases: string[] = [];
  const addBase = (b: string) => {
    const clean = b.trim();
    if (clean && !bases.includes(clean)) bases.push(clean);
  };

  for (const raw of names) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    addBase(trimmed); // 예: "Alex Shelley", "Satoshi Kojima"
    addBase(trimmed.replace(/[.]/g, "")); // 예: "Davey Boy Smith Jr"
    addBase(slugifyName(trimmed)); // 예: "alex-shelley"
    addBase(trimmed.toLowerCase()); // 예: "alex shelley"
    addBase(trimmed.replace(/\s+/g, "_")); // 예: "Alex_Shelley"
    addBase(trimmed.toLowerCase().replace(/\s+/g, "_")); // 예: "alex_shelley"
  }

  const paths: string[] = [];
  for (const base of bases) {
    for (const ext of extensions) {
      paths.push(`photos/${encodeURI(`${base}.${ext}`)}`);
    }
  }
  return paths;
}

// photos/ 폴더에 새로 넣은 이미지 파일을 빌드 없이 실시간으로 탐지합니다.
export const probePhoto = (names: string[], extensions = ["jpg", "png", "webp", "jpeg"]): Promise<string> => {
  const cleanNames = names.map(n => n.trim()).filter(Boolean);
  if (!cleanNames.length) return Promise.resolve("");

  // 이미 index.json 에 있는 사진이면 바로 반환
  for (const name of cleanNames) {
    const file = findPhotoFile(name, bundledPhotos);
    if (file) return Promise.resolve(photoPath(file));
  }

  const cacheKey = cleanNames.join("|");
  if (probedCache.has(cacheKey)) {
    return Promise.resolve(probedCache.get(cacheKey) ?? "");
  }
  const existing = inflightProbes.get(cacheKey);
  if (existing) return existing;

  const candidates = buildCandidatePaths(cleanNames, extensions);
  if (!candidates.length) return Promise.resolve("");

  const promise = new Promise<string>(resolve => {
    const tryNext = (index: number) => {
      if (index >= candidates.length) {
        probedCache.set(cacheKey, "");
        inflightProbes.delete(cacheKey);
        resolve("");
        return;
      }
      const image = new Image();
      image.onload = () => {
        const found = candidates[index];
        probedCache.set(cacheKey, found);
        // 발견된 파일명을 bundledPhotos 목록에도 추가하여 편집창 드롭다운에서도 바로 선택 가능하게 함
        const decodedFile = decodeURI(found.replace(/^photos\//, ""));
        if (decodedFile && !bundledPhotos.includes(decodedFile)) {
          bundledPhotos.push(decodedFile);
        }
        inflightProbes.delete(cacheKey);
        resolve(found);
      };
      image.onerror = () => tryNext(index + 1);
      image.src = candidates[index];
    };
    tryNext(0);
  });

  inflightProbes.set(cacheKey, promise);
  return promise;
};

// 선수 사진: 개별 등록(업로드/선택)이 있으면 그걸, 없으면 photos 폴더 파일을 씁니다.
export const imageOf = (wrestler: { image: string; names: string[] }): string => wrestler.image || photoFor(wrestler.names);
