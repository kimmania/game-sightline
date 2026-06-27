import type { CellState, Difficulty, GameState, Puzzle } from './types';
import { RECENT_KEY } from './types';

const banks: Record<Difficulty, Puzzle[] | null> = {
  easy: null,
  medium: null,
  hard: null,
  expert: null,
};

function getRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecent(id: string, max = 20): void {
  try {
    const recent = [id, ...getRecent().filter((x: string) => x !== id)].slice(0, max);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {}
}

export async function fetchBank(difficulty: Difficulty): Promise<Puzzle[]> {
  if (banks[difficulty]) return banks[difficulty]!;
  const stamp = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : Date.now();
  const base = import.meta.env.BASE_URL;
  const url = `${base}puzzles/${difficulty}.json?v=${stamp}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${difficulty} puzzles: ${res.status}`);
  const data = (await res.json()) as Puzzle[];
  banks[difficulty] = data;
  return data;
}

export function createGameState(puzzle: Puzzle, difficulty: Difficulty): GameState {
  const size = puzzle.size;
  const grid: CellState[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => 'unknown'),
  );
  for (const g of puzzle.givens) {
    grid[g.y][g.x] = 'white';
  }
  return {
    size,
    grid,
    givens: puzzle.givens,
    solution: puzzle.solution,
    puzzleId: puzzle.id,
    difficulty,
    mistakes: 0,
    won: false,
    sightlineMode: false,
    activeSightline: null,
    history: [],
    version: 1,
  };
}

export async function startNewGame(difficulty: Difficulty): Promise<GameState> {
  const bank = await fetchBank(difficulty);
  const recent = getRecent();
  const candidates = bank.filter((p) => !recent.includes(p.id));
  const pool = candidates.length > 0 ? candidates : bank;
  const puzzle = pool[Math.floor(Math.random() * pool.length)];
  addRecent(puzzle.id);
  return createGameState(puzzle, difficulty);
}

export function resetGameState(state: GameState): void {
  const size = state.size;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      state.grid[r][c] = 'unknown';
    }
  }
  for (const g of state.givens) {
    state.grid[g.y][g.x] = 'white';
  }
  state.won = false;
  state.mistakes = 0;
  state.activeSightline = null;
  state.history = [];
}
