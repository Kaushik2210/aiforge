import Dexie, { type Table } from "dexie";
import {
  SCHEMA_VERSION,
  applyEvent,
  emptySnapshot,
  exportProgress,
  mergeSnapshots,
  migrate,
  parseExport,
  validateSnapshot,
  type ProgressEvent,
  type ProgressSnapshot,
  type ReduceResult,
} from "@aiforge/engine";

/**
 * IndexedDB persistence (Dexie). The whole progress lives in one snapshot row so
 * every update is a single atomic read-modify-write transaction: two tabs, or
 * two quick events, can never lose each other's changes. All rules live in
 * @aiforge/engine; this file only loads, reduces and saves.
 */

export interface SnapshotRow {
  id: "main";
  schemaVersion: number;
  data: unknown;
  updatedAt: number;
}

export interface BackupRow {
  id?: number;
  at: number;
  reason: string;
  data: unknown;
}

export const MAX_BACKUPS = 3;

export class AIForgeDB extends Dexie {
  snapshot!: Table<SnapshotRow, string>;
  backups!: Table<BackupRow, number>;

  constructor(name = "aiforge") {
    super(name);
    // Schema version 1. Future table changes add a new .version(n) block here;
    // changes to the snapshot's own shape go through migrate() in the engine.
    this.version(1).stores({ snapshot: "id", backups: "++id, at" });
  }
}

export type LoadStatus = "ok" | "created" | "recovered" | "newer-version";

export interface LoadResult {
  status: LoadStatus;
  snapshot: ProgressSnapshot;
  /** Human-readable explanation for "recovered" and "newer-version". */
  message?: string;
}

async function addBackup(db: AIForgeDB, reason: string, data: unknown, now: number) {
  await db.backups.add({ at: now, reason, data });
  const all = await db.backups.orderBy("at").toArray();
  const extra = all.length - MAX_BACKUPS;
  if (extra > 0) await db.backups.bulkDelete(all.slice(0, extra).map((b) => b.id!));
}

/** Parse a stored row into a valid snapshot, migrating older data. */
function readRow(row: SnapshotRow): { ok: true; snapshot: ProgressSnapshot } | { ok: false; newer: boolean; error: string } {
  const migrated = migrate(row.data);
  if (!migrated.ok) return { ok: false, newer: /newer version/.test(migrated.error), error: migrated.error };
  const valid = validateSnapshot(migrated.data);
  if (!valid.ok) return { ok: false, newer: false, error: valid.errors.join("; ") };
  return { ok: true, snapshot: valid.snapshot };
}

/**
 * Load the saved progress, creating an empty one on first use. Corrupt data is
 * never silently destroyed: it is copied to backups first. Data saved by a
 * newer version of the app is left completely untouched.
 */
export async function loadSnapshot(db: AIForgeDB, zone: string, now: number): Promise<LoadResult> {
  return db.transaction("rw", db.snapshot, db.backups, async () => {
    const row = await db.snapshot.get("main");
    if (!row) {
      const fresh = emptySnapshot(zone, now);
      await db.snapshot.put({ id: "main", schemaVersion: SCHEMA_VERSION, data: fresh, updatedAt: now });
      return { status: "created", snapshot: fresh };
    }
    const parsed = readRow(row);
    if (parsed.ok) return { status: "ok", snapshot: parsed.snapshot };
    if (parsed.newer) {
      return {
        status: "newer-version",
        snapshot: emptySnapshot(zone, now),
        message: parsed.error,
      };
    }
    await addBackup(db, "corrupt-on-load", row.data, now);
    const fresh = emptySnapshot(zone, now);
    await db.snapshot.put({ id: "main", schemaVersion: SCHEMA_VERSION, data: fresh, updatedAt: now });
    return {
      status: "recovered",
      snapshot: fresh,
      message: "Your saved progress could not be read, so a copy was kept and you were given a fresh start. You can still export the copy from Settings.",
    };
  });
}

export class NewerVersionError extends Error {
  constructor() {
    super("Saved progress is from a newer version of AIForge; refusing to overwrite it.");
  }
}

/** Apply one learning event atomically and persist the result. */
export async function dispatchEvent(
  db: AIForgeDB,
  event: ProgressEvent,
  now: number,
  zone: string,
): Promise<ReduceResult> {
  return db.transaction("rw", db.snapshot, db.backups, async () => {
    const row = await db.snapshot.get("main");
    let current: ProgressSnapshot;
    if (!row) current = emptySnapshot(zone, now);
    else {
      const parsed = readRow(row);
      if (!parsed.ok) {
        if (parsed.newer) throw new NewerVersionError();
        await addBackup(db, "corrupt-on-write", row.data, now);
        current = emptySnapshot(zone, now);
      } else current = parsed.snapshot;
    }
    const result = applyEvent(current, event, now, zone);
    await db.snapshot.put({ id: "main", schemaVersion: SCHEMA_VERSION, data: result.snapshot, updatedAt: now });
    return result;
  });
}

export type ImportMode = "replace" | "merge";
export type ImportResult = { ok: true; snapshot: ProgressSnapshot } | { ok: false; errors: string[] };

/** Import an exported file. The current data is backed up first; bad files change nothing. */
export async function importText(
  db: AIForgeDB,
  text: string,
  mode: ImportMode,
  now: number,
  zone: string,
): Promise<ImportResult> {
  const parsed = parseExport(text);
  if (!parsed.ok) return parsed;
  return db.transaction("rw", db.snapshot, db.backups, async () => {
    const row = await db.snapshot.get("main");
    if (row) {
      const existing = readRow(row);
      if (!existing.ok && existing.newer) return { ok: false as const, errors: [existing.error] };
      await addBackup(db, `before-import-${mode}`, row.data, now);
      const next = existing.ok && mode === "merge" ? mergeSnapshots(existing.snapshot, parsed.snapshot) : parsed.snapshot;
      await db.snapshot.put({ id: "main", schemaVersion: SCHEMA_VERSION, data: next, updatedAt: now });
      return { ok: true as const, snapshot: next };
    }
    await db.snapshot.put({ id: "main", schemaVersion: SCHEMA_VERSION, data: parsed.snapshot, updatedAt: now });
    void zone;
    return { ok: true as const, snapshot: parsed.snapshot };
  });
}

/** The text of a progress export file for download. */
export async function exportText(db: AIForgeDB, now: number, zone: string): Promise<string> {
  const { snapshot } = await loadSnapshot(db, zone, now);
  return JSON.stringify(exportProgress(snapshot, now), null, 2);
}

/** Erase progress (a backup is kept first). */
export async function resetAll(db: AIForgeDB, now: number, zone: string): Promise<ProgressSnapshot> {
  return db.transaction("rw", db.snapshot, db.backups, async () => {
    const row = await db.snapshot.get("main");
    if (row) await addBackup(db, "before-reset", row.data, now);
    const fresh = emptySnapshot(zone, now);
    await db.snapshot.put({ id: "main", schemaVersion: SCHEMA_VERSION, data: fresh, updatedAt: now });
    return fresh;
  });
}
