import Storage from 'expo-sqlite/kv-store';
import type { LocalUser } from '../domain/types';

const USER_KEY = 'lifelens.local-user.v1';
const SESSION_KEY = 'lifelens.local-session.v1';

/**
 * Hackathon-only local account store. It deliberately has no network path;
 * production authentication must use a server-side identity provider.
 */
export async function loadLocalUser(): Promise<LocalUser | null> {
  try {
    const raw = await Storage.getItem(USER_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<LocalUser>;
    if (!isUser(value)) return null;
    return { name: value.name, email: value.email.toLocaleLowerCase('en-US'), password: value.password };
  } catch {
    return null;
  }
}

export async function saveLocalUser(user: LocalUser): Promise<void> {
  await Storage.setItem(USER_KEY, JSON.stringify({ ...user, email: user.email.toLocaleLowerCase('en-US') }));
  await Storage.setItem(SESSION_KEY, 'active');
}

/** Returns an account only when the learner has an active local session. */
export async function loadActiveLocalUser(): Promise<LocalUser | null> {
  try {
    if (await Storage.getItem(SESSION_KEY) !== 'active') return null;
    return await loadLocalUser();
  } catch {
    return null;
  }
}

export async function markLocalSessionActive(): Promise<void> {
  await Storage.setItem(SESSION_KEY, 'active');
}

export async function clearLocalSession(): Promise<void> {
  await Storage.removeItem(SESSION_KEY);
}

export function isMatchingLocalUser(user: LocalUser, email: string, password: string): boolean {
  return user.email === email.trim().toLocaleLowerCase('en-US') && user.password === password;
}

function isUser(value: Partial<LocalUser>): value is LocalUser {
  return typeof value.name === 'string' && value.name.trim().length >= 2
    && typeof value.email === 'string' && value.email.includes('@')
    && typeof value.password === 'string' && value.password.length >= 4;
}
