// 팝업(모달) 접근성 도우미: 열리면 첫 요소로 포커스, Tab이 팝업 안에서만 돌게,
// 닫히면 원래 있던 자리로 포커스를 돌려줍니다. Esc는 각 팝업이 이미 처리합니다.
import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(ref: RefObject<HTMLElement | null>, active = true) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;
    const previous = document.activeElement as HTMLElement | null;

    const visible = () =>
      Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        el => !el.hasAttribute("aria-hidden") && el.getClientRects().length > 0
      );

    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
    const first = visible()[0] ?? node;
    first.focus({ preventScroll: true });

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const list = visible();
      if (!list.length) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (event.shiftKey && (document.activeElement === firstEl || document.activeElement === node)) {
        event.preventDefault();
        lastEl.focus();
      } else if (!event.shiftKey && document.activeElement === lastEl) {
        event.preventDefault();
        firstEl.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      previous?.focus?.({ preventScroll: true });
    };
  }, [active, ref]);
}
