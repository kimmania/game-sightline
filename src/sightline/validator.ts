import type { CellState, Given } from './types';

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const;

export interface SightlineBounds {
  min: number;
  max: number;
  exact: number | null;
}

export function sightlineBounds(grid: CellState[][], row: number, col: number): SightlineBounds {
  const size = grid.length;
  let min = 0;
  let max = 0;

  for (const [dr, dc] of DIRS) {
    // min: first unknown blocks the rest
    let rr = row + dr,
      cc = col + dc;
    while (rr >= 0 && rr < size && cc >= 0 && cc < size) {
      const s = grid[rr][cc];
      if (s === 'black') break;
      if (s === 'unknown') break;
      min++;
      rr += dr;
      cc += dc;
    }

    // max: everything until edge or black counts
    rr = row + dr;
    cc = col + dc;
    while (rr >= 0 && rr < size && cc >= 0 && cc < size) {
      if (grid[rr][cc] === 'black') break;
      max++;
      rr += dr;
      cc += dc;
    }
  }

  return { min, max, exact: min === max ? min : null };
}

export function getViolatedGivens(grid: CellState[][], givens: Given[]): Given[] {
  return givens.filter((g) => {
    const b = sightlineBounds(grid, g.y, g.x);
    return b.max < g.value || b.min > g.value;
  });
}

export function getSatisfiedGivens(grid: CellState[][], givens: Given[]): Given[] {
  return givens.filter((g) => {
    const b = sightlineBounds(grid, g.y, g.x);
    return b.exact !== null && b.exact === g.value;
  });
}

export function getAdjacentBlackConflicts(
  grid: CellState[][],
): { row: number; col: number }[] {
  const size = grid.length;
  const out: { row: number; col: number }[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 'black') continue;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr,
          nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size && grid[nr][nc] === 'black') {
          out.push({ row: r, col: c });
          break;
        }
      }
    }
  }
  return out;
}

export function isComplete(grid: CellState[][]): boolean {
  return grid.every((row) => row.every((c) => c !== 'unknown'));
}

export function isWhiteConnected(grid: CellState[][]): boolean {
  const size = grid.length;
  let start: [number, number] | null = null;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] !== 'black') {
        start = [r, c];
        break;
      }
    }
    if (start) break;
  }
  if (!start) return false;

  const visited = new Set<string>([`${start[0]},${start[1]}`]);
  const q: [number, number][] = [start];
  let head = 0;
  while (head < q.length) {
    const [r, c] = q[head++];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr,
        nc = c + dc;
      if (
        nr >= 0 &&
        nr < size &&
        nc >= 0 &&
        nc < size &&
        grid[nr][nc] !== 'black'
      ) {
        const key = `${nr},${nc}`;
        if (!visited.has(key)) {
          visited.add(key);
          q.push([nr, nc]);
        }
      }
    }
  }
  const whiteCount = grid.flat().filter((c) => c !== 'black').length;
  return visited.size === whiteCount;
}

export function isWin(grid: CellState[][], givens: Given[]): boolean {
  if (!isComplete(grid)) return false;
  if (!isWhiteConnected(grid)) return false;
  if (getAdjacentBlackConflicts(grid).length > 0) return false;
  return givens.every((g) => {
    const b = sightlineBounds(grid, g.y, g.x);
    return b.exact === g.value;
  });
}
