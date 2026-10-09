import Storage from 'expo-sqlite/kv-store';
import type { LearningSnapshot } from '../domain/types';

const SNAPSHOT_KEY = 'lifelens.learning-snapshot.v1';

export async function loadLearningSnapshot(): Promise<LearningSnapshot | null> {
  try {
    const raw = await Storage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LearningSnapshot>;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.phrases) || !Array.isArray(parsed.history)) return null;
    return parsed as LearningSnapshot;
  } catch {
    return null;
  }
}

export async function saveLearningSnapshot(snapshot: LearningSnapshot): Promise<void> {
  await Storage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}
