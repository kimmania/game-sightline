import type { GameState } from './types';
import { STORAGE_KEY } from './types';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

export function clearSavedGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
