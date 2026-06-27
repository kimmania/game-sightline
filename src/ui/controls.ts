import type { Difficulty } from '../sightline/types';

export function bindControlHandlers(options: {
  onNewGame: () => void;
  onReset: () => void;
  onUndo: () => void;
  onHelp: () => void;
  onFillWhite: () => void;
  onDifficultyChange: () => void;
  onToggleSightlines: () => void;
  onModeToggle: () => void;
  onHint: () => void;
  onToggleGoal: () => void;
}): void {
  document.getElementById('new-game')?.addEventListener('click', options.onNewGame);
  document.getElementById('reset')?.addEventListener('click', options.onReset);
  document.getElementById('undo')?.addEventListener('click', options.onUndo);
  document.getElementById('help')?.addEventListener('click', options.onHelp);
  document.getElementById('fill-white')?.addEventListener('click', options.onFillWhite);
  document.getElementById('hint')?.addEventListener('click', options.onHint);
  document.getElementById('toggle-sightlines')?.addEventListener('click', options.onToggleSightlines);
  document.getElementById('mode-toggle')?.addEventListener('click', options.onModeToggle);
  document.getElementById('difficulty')?.addEventListener('change', options.onDifficultyChange);
  document.getElementById('sidebar-toggle')?.addEventListener('click', options.onToggleGoal);
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

export function setHintEnabled(enabled: boolean): void {
  const el = document.getElementById('hint') as HTMLButtonElement | null;
  if (el) el.disabled = !enabled;
}

export function setModeButton(mode: 'black' | 'white'): void {
  const el = document.getElementById('mode-toggle') as HTMLButtonElement | null;
  if (!el) return;
  el.dataset.mode = mode;
  el.textContent = mode === 'black' ? '■' : '□';
  el.classList.toggle('black-mode', mode === 'black');
}

export function toggleGoalCollapsed(): void {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('sidebar-toggle') as HTMLButtonElement | null;
  if (!sidebar || !btn) return;
  const collapsed = sidebar.classList.toggle('collapsed');
  btn.setAttribute('aria-expanded', String(!collapsed));
  const label = btn.querySelector('.toggle-label') as HTMLElement | null;
  if (label) label.textContent = collapsed ? 'Show tips' : 'Hide tips';
  localStorage.setItem('sightline-goal-collapsed', collapsed ? '1' : '0');
}

export function setGoalCollapsed(collapsed: boolean): void {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('sidebar-toggle') as HTMLButtonElement | null;
  if (!sidebar || !btn) return;
  sidebar.classList.toggle('collapsed', collapsed);
  btn.setAttribute('aria-expanded', String(!collapsed));
  const label = btn.querySelector('.toggle-label') as HTMLElement | null;
  if (label) label.textContent = collapsed ? 'Show tips' : 'Hide tips';
  localStorage.setItem('sightline-goal-collapsed', collapsed ? '1' : '0');
}
