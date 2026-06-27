export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type CellState = 'unknown' | 'white' | 'black';

export interface Given {
  x: number;
  y: number;
  value: number;
}

export interface Puzzle {
  id: string;
  size: number;
  givens: Given[];
  solution: string; // row-major bit string, '1'=black, '0'=white
}

export interface GameState {
  size: number;
  grid: CellState[][];
  givens: Given[];
  solution: string;
  puzzleId: string;
  difficulty: Difficulty;
  mistakes: number;
  won: boolean;
  sightlineMode: boolean;
  activeSightline: { x: number; y: number } | null;
  history: CellState[][][];
  version: number;
}

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert'];
export const STORAGE_KEY = 'sightline-save';
export const RECENT_KEY = 'sightline-recent';
export const LAST_DIFFICULTY_KEY = 'sightline-last-difficulty';
