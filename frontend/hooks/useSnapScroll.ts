import { useEffect, useRef } from "react";

const easeOutExpo = (t: number) =>
  t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

// Within this many px of a section's top = considered "at" that section
const AT_THRESHOLD = 120;
const DURATION = 480; // ms

export function useSnapScroll(enabled: boolean) {
  const animating = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const getSections = () =>
      Array.from(document.querySelectorAll<HTMLElement>("[data-snap]"));

    const animateTo = (targetY: number) => {
      if (animating.current) return;
      animating.current = true;

      const startY = window.scrollY;
      const dist   = targetY - startY;
      const start  = performance.now();

      const tick = (now: number) => {
        const p = Math.min((now - start) / DURATION, 1);
        window.scrollTo(0, startY + dist * easeOutExpo(p));
        if (p < 1) requestAnimationFrame(tick);
        else       animating.current = false;
      };

      requestAnimationFrame(tick);
    };

    // Returns true if the scroll was intercepted (caller should preventDefault)
    const handle = (deltaY: number): boolean => {
      if (animating.current) return true; // block input mid-animation
      const snaps = getSections();
      const dir   = deltaY > 0 ? 1 : -1;

      // Which section are we currently "at"?
      const atIdx = snaps.findIndex(
        (s) => Math.abs(window.scrollY - s.offsetTop) < AT_THRESHOLD
      );

      // Not at any section boundary — let browser scroll freely (e.g. inside IntegrationRecipes)
      if (atIdx === -1) return false;

      const nextIdx = atIdx + dir;
      // Already at first or last section boundary, don't intercept
      if (nextIdx < 0 || nextIdx >= snaps.length) return false;

      animateTo(snaps[nextIdx].offsetTop);
      return true;
    };

    const onWheel = (e: WheelEvent) => {
      if (handle(e.deltaY)) e.preventDefault();
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const delta = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(delta) > 40) handle(delta);
    };

    window.addEventListener("wheel",      onWheel,      { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true  });
    window.addEventListener("touchend",   onTouchEnd,   { passive: true  });

    return () => {
      window.removeEventListener("wheel",      onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend",   onTouchEnd);
    };
  }, [enabled]);
}
