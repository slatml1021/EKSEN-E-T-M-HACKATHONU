import type { LearningSnapshot } from '../domain/types';

const SNAPSHOT_KEY = 'lifelens.learning-snapshot.v1';

/**
 * Browser persistence deliberately uses localStorage instead of SQLite WASM.
 * It keeps the same learning snapshot contract as mobile, but avoids a worker
 * lifecycle error during browser hot reloads and makes the web build portable.
 */
export async function loadLearningSnapshot(): Promise<LearningSnapshot | null> {
  try {
    const raw = globalThis.localStorage?.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LearningSnapshot>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.phrases) || !Array.isArray(parsed.history)) return null;
    return parsed as LearningSnapshot;
  } catch {
    return null;
  }
}

export async function saveLearningSnapshot(snapshot: LearningSnapshot): Promise<void> {
  try {
    globalThis.localStorage?.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Web storage can be unavailable in private browsing; the session remains usable.
  }
}
