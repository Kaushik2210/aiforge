/** Data and messages shared between the page and the world map game. */

export interface MapRealm {
  /** Realm number, 1-based. */
  n: number;
  name: string;
  blurb: string;
  /** True when the realm has playable content today. */
  open: boolean;
}

/** Game to page. */
export interface MapEvents {
  ready: { nodes: number };
  "realm:focus": { n: number };
  "realm:select": { n: number };
  error: { message: string };
}

/** Page to game (keyboard and buttons are forwarded from real DOM elements). */
export interface MapCommands {
  "focus:step": { delta: number };
  "focus:set": { n: number };
  "select:focused": undefined;
  "pan:by": { dy: number };
}

export interface MapSnapshot {
  focused: number;
  zoom: number;
  centerY: number;
  nodes: { n: number; x: number; y: number }[];
}
