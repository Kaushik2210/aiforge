"use client";

import { useEffect, useState } from "react";
import { readAsciiMode } from "@/lib/ascii";

/**
 * Whether ASCII mode is on. It starts false so the first render matches the
 * server, then follows the `data-ascii` attribute on <html> (set before paint by an
 * inline script) and changes to it. Reading the attribute during render would make
 * the first client render differ from the server and make React drop the page's
 * <html> attributes.
 */
export function useAsciiMode(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const sync = () => setOn(readAsciiMode());
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-ascii"] });
    return () => observer.disconnect();
  }, []);
  return on;
}
