/**
 * Where the site is served from. Empty at the root of a domain; "/aiforge" on
 * GitHub Pages project sites. Set with NEXT_PUBLIC_BASE_PATH at build time.
 * next/link and next/script add it for you; plain <a href>, fetch and worker
 * URLs do not, so they go through `withBase`.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a root-relative path ("/quests/x/") with the base path. Other URLs pass through. */
export function withBase(path: string, base: string = BASE_PATH): string {
  return path.startsWith("/") && !path.startsWith("//") ? `${base}${path}` : path;
}
