// 주소(URL)와 화면 상태를 연결하는 도우미들.
// - 검색어/첫 글자/정렬/열 수를 주소에 담아 새로고침·공유해도 그대로 유지합니다.
// - ?p=선수이름 으로 특정 선수 프로필을 바로 열 수 있습니다(딥링크).
import { slugifyName } from "@/data/photos";
import { wrestlerNames, type SortOrder, type Wrestler } from "@/lib/storage";

export type RosterUrlState = {
  q: string;
  letter: string; // "all" | "#" | "A".."Z" | "기타"
  sort: SortOrder | null;
  cols: number | null;
  profile: string | null; // ?p=
};

const SORTS: SortOrder[] = ["default", "newest", "oldest", "asc", "desc", "favorites", "random"];
const isLetter = (value: string) => value === "all" || value === "기타" || /^[#A-Z]$/.test(value);

export function readRosterUrl(): RosterUrlState {
  if (typeof window === "undefined") return { q: "", letter: "all", sort: null, cols: null, profile: null };
  const params = new URL(window.location.href).searchParams;
  const sortRaw = params.get("sort");
  const colsRaw = Number(params.get("cols"));
  const letterRaw = params.get("letter") ?? "all";
  return {
    q: params.get("q") ?? "",
    letter: isLetter(letterRaw) ? letterRaw : "all",
    sort: sortRaw && (SORTS as string[]).includes(sortRaw) ? (sortRaw as SortOrder) : null,
    cols: Number.isInteger(colsRaw) && colsRaw >= 3 && colsRaw <= 9 ? colsRaw : null,
    profile: params.get("p"),
  };
}

// 현재 주소에 값만 덮어씁니다. 빈 값/기본값은 주소에서 지워 깔끔하게 유지합니다.
export function writeRosterUrl(patch: Record<string, string | number | null | undefined>) {
  if (typeof window === "undefined") return;
  const next = new URL(window.location.href);
  Object.entries(patch).forEach(([key, raw]) => {
    const value = raw === null || raw === undefined ? "" : String(raw);
    const isDefault =
      value === "" ||
      value === "all" ||
      (key === "sort" && value === "default") ||
      (key === "letter" && value === "all") ||
      (key === "cols" && value === "7");
    if (isDefault) next.searchParams.delete(key);
    else next.searchParams.set(key, value);
  });
  const search = next.searchParams.toString();
  const target = `${next.pathname}${search ? `?${search}` : ""}${next.hash}`;
  if (target !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(window.history.state, "", target);
  }
}

// 선수 한 명을 가리키는 짧은 주소용 이름 (영문/숫자/한글 유지)
export const profileSlug = (wrestler: Wrestler) => slugifyName(wrestlerNames(wrestler)[0] ?? "") || wrestler.id;

export function wrestlerBySlug(list: Wrestler[], slug: string | null): Wrestler | null {
  if (!slug) return null;
  let needle = slug;
  try {
    needle = decodeURIComponent(slug);
  } catch {}
  const key = needle.trim().toLowerCase();
  return (
    list.find(w => profileSlug(w).toLowerCase() === key) ??
    list.find(w => w.id.toLowerCase() === key) ??
    list.find(w => wrestlerNames(w).some(name => name.trim().toLowerCase() === key)) ??
    null
  );
}

// 공유용 전체 주소 (지금 보고 있는 필터는 빼고 선수만 담습니다)
export function profileUrl(wrestler: Wrestler) {
  const next = new URL(window.location.href);
  next.search = "";
  next.searchParams.set("p", profileSlug(wrestler));
  next.hash = "";
  return next.toString();
}
