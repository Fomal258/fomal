// 사진 파일 자동 매칭 규칙. 브라우저(localStorage)에만 저장됩니다.
// 규칙을 바꾸면 화면이 즉시 다시 그려지고, 매칭 결과도 함께 바뀝니다.

import { useSyncExternalStore } from "react";

export type PhotoRules = {
  separators: string[]; // 파일명에서 단어를 나누는 문자
  ignoredPrefixes: string[]; // 파일명 앞에서 무시할 단어 (img, photo …)
  prefixMinLength: number; // 접두어 매칭을 허용할 최소 이름 길이
  containsMinLength: number; // 부분 매칭을 허용할 최소 이름 길이
  usePrefix: boolean; // "이름으로 시작" 규칙 사용
  useContains: boolean; // "이름을 포함" 규칙 사용
};

export const defaultPhotoRules: PhotoRules = {
  separators: ["-", "_", " "],
  ignoredPrefixes: ["img", "image", "photo", "pic", "screenshot", "kakao", "download", "wwe"],
  prefixMinLength: 3,
  containsMinLength: 6,
  usePrefix: true,
  useContains: true,
};

const STORAGE_KEY = "ring-roster:photo-rules";

const cleanList = (value: unknown, fallback: string[], keepSpace = false) => {
  if (!Array.isArray(value)) return [...fallback];
  const list = value
    .filter((item): item is string => typeof item === "string")
    .map(item => (keepSpace ? item.slice(0, 1) : item.trim()))
    .filter(item => item.length > 0);
  return [...new Set(list)];
};

const clamp = (value: unknown, fallback: number, min: number, max: number) => {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
};

const sanitize = (value: unknown): PhotoRules => {
  const source = (value ?? {}) as Partial<PhotoRules>;
  return {
    separators: cleanList(source.separators, defaultPhotoRules.separators, true).slice(0, 8),
    ignoredPrefixes: cleanList(source.ignoredPrefixes, defaultPhotoRules.ignoredPrefixes).slice(0, 30),
    prefixMinLength: clamp(source.prefixMinLength, defaultPhotoRules.prefixMinLength, 1, 40),
    containsMinLength: clamp(source.containsMinLength, defaultPhotoRules.containsMinLength, 1, 40),
    usePrefix: typeof source.usePrefix === "boolean" ? source.usePrefix : defaultPhotoRules.usePrefix,
    useContains: typeof source.useContains === "boolean" ? source.useContains : defaultPhotoRules.useContains,
  };
};

const read = (): PhotoRules => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : { ...defaultPhotoRules };
  } catch {
    return { ...defaultPhotoRules };
  }
};

let cache: PhotoRules = typeof localStorage === "undefined" ? { ...defaultPhotoRules } : read();
const listeners = new Set<() => void>();

export const getPhotoRules = () => cache;

export const savePhotoRules = (next: PhotoRules) => {
  cache = sanitize(next);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    /* 저장 공간이 막혀도 이번 세션에는 적용 */
  }
  listeners.forEach(listener => listener());
};

export const resetPhotoRules = () => savePhotoRules(defaultPhotoRules);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// 규칙이 바뀌면 자동으로 다시 렌더링되는 훅
export const usePhotoRules = () => useSyncExternalStore(subscribe, getPhotoRules, getPhotoRules);

const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const escapeChars = (chars: string[]) => chars.map(char => char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("");

// 파일명/이름을 규칙의 구분자로 나눠 단어 목록으로 만듭니다.
const tokenize = (value: string, separators: string[]): string[] => {
  const base = value.toLowerCase().replace(EXT, "");
  if (!separators.length) return [base.replace(/[^a-z0-9]/g, "")].filter(Boolean);
  return base
    .split(new RegExp(`[${escapeChars(separators)}]+`))
    .map(part => part.replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
};

const stripIgnoredPrefixes = (tokens: string[], ignored: string[]) => {
  const set = new Set(ignored.map(item => item.toLowerCase()));
  let index = 0;
  while (index < tokens.length && set.has(tokens[index])) index += 1;
  return tokens.slice(index);
};

const startsWithTokens = (tokens: string[], prefix: string[]) => prefix.every((token, index) => tokens[index] === token);

const containsTokens = (tokens: string[], needle: string[]) => {
  for (let start = 0; start <= tokens.length - needle.length; start += 1) {
    if (needle.every((token, offset) => tokens[start + offset] === token)) return true;
  }
  return false;
};

// 이름 하나에 해당하는 파일을 규칙에 따라 찾습니다. (없으면 빈 문자열)
export function findPhotoFile(name: string, files: string[], rules: PhotoRules = cache): string {
  const nameTokens = tokenize(name, rules.separators);
  if (!nameTokens.length) return "";
  const nameKey = nameTokens.join("-");

  const candidates: { file: string; rank: number; size: number }[] = [];

  files.forEach(file => {
    const tokens = stripIgnoredPrefixes(tokenize(file, rules.separators), rules.ignoredPrefixes);
    if (!tokens.length) return;

    if (tokens.join("-") === nameKey) {
      candidates.push({ file, rank: 0, size: tokens.length });
      return;
    }
    if (rules.usePrefix && nameKey.length >= rules.prefixMinLength && startsWithTokens(tokens, nameTokens)) {
      candidates.push({ file, rank: 1, size: tokens.length });
      return;
    }
    if (rules.useContains && nameKey.length >= rules.containsMinLength && containsTokens(tokens, nameTokens)) {
      candidates.push({ file, rank: 2, size: tokens.length });
    }
  });

  candidates.sort((a, b) => a.rank - b.rank || a.size - b.size || a.file.localeCompare(b.file, "en"));
  return candidates[0]?.file ?? "";
}
