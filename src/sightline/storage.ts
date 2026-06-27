import type { GameState } from './types';
import { STORAGE_KEY } from './types';

const CURRENT_SAVE_VERSION = 1;

export function saveGame(state: GameState): void {
  try {
    const toSave = { ...state, version: CURRENT_SAVE_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {}
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState & { version?: number };
    const version = parsed.version ?? 1;
    if (version !== CURRENT_SAVE_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
