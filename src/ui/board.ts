import type { GameState } from '../sightline/types';
import {
  getAdjacentBlackConflicts,
  getSatisfiedGivens,
  getViolatedGivens,
  sightlineBounds,
} from '../sightline/validator';

interface BoardElements {
  container: HTMLElement;
  cells: HTMLElement[][];
}

export function createBoard(container: HTMLElement): BoardElements {
  return { container, cells: [] };
}

function ensureSize(board: BoardElements, size: number): void {
  if (board.cells.length === size && board.cells[0]?.length === size) return;

  board.container.innerHTML = '';
  board.container.style.setProperty('--board-n', String(size));
  board.container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  board.container.style.gridTemplateRows = `repeat(${size}, 1fr)`;

  const cells: HTMLElement[][] = [];
  for (let r = 0; r < size; r++) {
    cells[r] = [];
    for (let c = 0; c < size; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.dataset.row = String(r);
      cell.dataset.col = String(c);
      cell.setAttribute('role', 'gridcell');

      const num = document.createElement('span');
      num.className = 'cell-number';
      cell.appendChild(num);

      const overlay = document.createElement('span');
      overlay.className = 'cell-overlay';
      cell.appendChild(overlay);

      board.container.appendChild(cell);
      cells[r][c] = cell;
    }
  }
  board.cells = cells;
}

export function renderBoard(board: BoardElements, state: GameState): void {
  ensureSize(board, state.size);

  const violatedSet = new Set<string>();
  for (const g of getViolatedGivens(state.grid, state.givens)) {
    violatedSet.add(`${g.y},${g.x}`);
  }
  const satisfiedSet = new Set<string>();
  for (const g of getSatisfiedGivens(state.grid, state.givens)) {
    satisfiedSet.add(`${g.y},${g.x}`);
  }
  const adjSet = new Set<string>();
  for (const { row, col } of getAdjacentBlackConflicts(state.grid)) {
    adjSet.add(`${row},${col}`);
  }

  const sightCells = new Set<string>();
  if (state.activeSightline) {
    const { x, y } = state.activeSightline;
    for (const [dr, dc] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ]) {
      let r = y + dr,
        c = x + dc;
      while (r >= 0 && r < state.size && c >= 0 && c < state.size) {
        sightCells.add(`${r},${c}`);
        if (state.grid[r][c] === 'black') break;
        r += dr;
        c += dc;
      }
    }
  }

  const givenMap = new Map<string, number>();
  for (const g of state.givens) givenMap.set(`${g.y},${g.x}`, g.value);

  for (let r = 0; r < state.size; r++) {
    for (let c = 0; c < state.size; c++) {
      const cell = board.cells[r][c];
      const st = state.grid[r][c];
      const key = `${r},${c}`;
      const isGiven = givenMap.has(key);

      cell.className = 'cell';
      if (st === 'black') cell.classList.add('black');
      else if (st === 'white') cell.classList.add('white');

      if (isGiven) cell.classList.add('given');

      if (violatedSet.has(key) || adjSet.has(key)) {
        cell.classList.add('conflict');
      } else if (satisfiedSet.has(key)) {
        cell.classList.add('satisfied');
      }

      if (sightCells.has(key)) cell.classList.add('hint-sightline');

      const numEl = cell.querySelector('.cell-number') as HTMLElement;
      const overEl = cell.querySelector('.cell-overlay') as HTMLElement;

      numEl.textContent = isGiven ? String(givenMap.get(key)!) : '';
      numEl.style.display = isGiven ? '' : 'none';

      if (state.sightlineMode && isGiven) {
        const b = sightlineBounds(state.grid, r, c);
        const target = givenMap.get(key)!;
        overEl.textContent = b.exact !== null ? `${b.exact}/${target}` : `?/${target}`;
      } else {
        overEl.textContent = '';
      }
    }
  }
}

export function bindBoardInteractions(
  board: BoardElements,
  onTap: (row: number, col: number) => void,
  onLongPress: (row: number, col: number) => void,
): void {
  let timer: number | null = null;
  let longTriggered = false;

  const start = (target: HTMLElement) => {
    const row = parseInt(target.dataset.row ?? '', 10);
    const col = parseInt(target.dataset.col ?? '', 10);
    if (Number.isNaN(row) || Number.isNaN(col)) return;
    longTriggered = false;
    timer = window.setTimeout(() => {
      longTriggered = true;
      onLongPress(row, col);
    }, 450);
  };

  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  board.container.addEventListener('pointerdown', (e) => {
    const target = (e.target as HTMLElement).closest('.cell') as HTMLElement | null;
    if (!target) return;
    start(target);
  });

  board.container.addEventListener('pointerup', (e) => {
    const target = (e.target as HTMLElement).closest('.cell') as HTMLElement | null;
    cancel();
    if (!target || longTriggered) return;
    const row = parseInt(target.dataset.row ?? '', 10);
    const col = parseInt(target.dataset.col ?? '', 10);
    if (Number.isNaN(row) || Number.isNaN(col)) return;
    onTap(row, col);
  });

  board.container.addEventListener('pointerleave', cancel);
  board.container.addEventListener('contextmenu', (e) => e.preventDefault());
}
