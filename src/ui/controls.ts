import type { Difficulty } from '../sightline/types';

export function bindControlHandlers(options: {
  onNewGame: () => void;
  onReset: () => void;
  onUndo: () => void;
  onHelp: () => void;
  onFillWhite: () => void;
  onDifficultyChange: () => void;
  onToggleSightlines: () => void;
}): void {
  document.getElementById('new-game')?.addEventListener('click', options.onNewGame);
  document.getElementById('reset')?.addEventListener('click', options.onReset);
  document.getElementById('undo')?.addEventListener('click', options.onUndo);
  document.getElementById('help')?.addEventListener('click', options.onHelp);
  document.getElementById('fill-white')?.addEventListener('click', options.onFillWhite);
  document.getElementById('toggle-sightlines')?.addEventListener('click', options.onToggleSightlines);
  document.getElementById('difficulty')?.addEventListener('change', options.onDifficultyChange);
}

export function getSelectedDifficulty(): Difficulty {
  const el = document.getElementById('difficulty') as HTMLSelectElement | null;
  return (el?.value ?? 'easy') as Difficulty;
}

export function setDifficulty(value: Difficulty): void {
  const el = document.getElementById('difficulty') as HTMLSelectElement | null;
  if (el) el.value = value;
}

export function updateDifficultyLabel(label: string): void {
  const el = document.getElementById('difficulty-label');
  if (el) el.textContent = label;
}

export function updateMistakes(count: number): void {
  const el = document.getElementById('mistakes');
  if (el) el.textContent = `Mistakes: ${count}`;
}

export function showWinBanner(show: boolean): void {
  const el = document.getElementById('win-banner');
  if (el) el.classList.toggle('hidden', !show);
}

export function updatePuzzleId(id: string): void {
  const el = document.getElementById('puzzle-id');
  if (el) el.textContent = id;
}

export function setUndoEnabled(enabled: boolean): void {
  const el = document.getElementById('undo') as HTMLButtonElement | null;
  if (el) el.disabled = !enabled;
}
