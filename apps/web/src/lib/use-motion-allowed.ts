"use client";

import { useEffect, useState } from "react";

/**
 * True when decorative motion may run: the system reduced-motion setting is off,
 * Focus mode is off and effects are not set to Off. Starts false so the server and
 * first client render match; it only turns true after the page has loaded.
 */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      const d = document.documentElement.dataset;
      setAllowed(!mq.matches && d.focus !== "on" && d.fx !== "0");
    };
    sync();
    mq.addEventListener("change", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-focus", "data-fx"] });
    return () => {
      mq.removeEventListener("change", sync);
      observer.disconnect();
    };
  }, []);
  return allowed;
}
