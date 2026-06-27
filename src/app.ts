import type { CellState, Difficulty, GameState } from './sightline/types';
import { DIFFICULTIES, LAST_DIFFICULTY_KEY } from './sightline/types';
import { fetchBank, resetGameState, startNewGame } from './sightline/puzzle';
import { clearSavedGame, loadSavedGame, saveGame } from './sightline/storage';
import { getAdjacentBlackConflicts, getViolatedGivens, isWin } from './sightline/validator';
import { bindBoardInteractions, createBoard, renderBoard } from './ui/board';
import {
  bindControlHandlers,
  getSelectedDifficulty,
  setDifficulty,
  setHintEnabled,
  setModeButton,
  setUndoEnabled,
  showWinBanner,
  updateDifficultyLabel,
  updateMistakes,
  updatePuzzleId,
} from './ui/controls';
import { closeHelp, openHelp } from './ui/help';

class SightlineApp {
  private state: GameState | null = null;
  private board = createBoard(document.getElementById('board')!);
  private loading = false;
  private placeMode: 'black' | 'white' = 'black';

  async init(): Promise<void> {
    fetchBank('easy').catch(() => {});

    bindBoardInteractions(
      this.board,
      (row, col) => this.handleTap(row, col),
      (row, col) => this.handleLongPress(row, col),
    );

    bindControlHandlers({
      onNewGame: () => void this.newGame(),
      onReset: () => this.handleReset(),
      onUndo: () => this.handleUndo(),
      onHelp: () => openHelp(),
      onFillWhite: () => this.handleFillWhite(),
      onDifficultyChange: () => void this.newGame(),
      onToggleSightlines: () => this.toggleSightlines(),
      onModeToggle: () => this.handleModeToggle(),
      onHint: () => this.handleHint(),
    });

    setModeButton(this.placeMode);

    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    const saved = loadSavedGame();
    if (saved && !saved.won) {
      this.state = saved;
      setDifficulty(saved.difficulty);
      this.refresh();
    } else {
      const last = localStorage.getItem(LAST_DIFFICULTY_KEY);
      if (last && DIFFICULTIES.includes(last as Difficulty)) {
        setDifficulty(last as Difficulty);
      }
      await this.newGame();
    }

    if (!localStorage.getItem('sightline-has-seen-help')) {
      openHelp();
      localStorage.setItem('sightline-has-seen-help', '1');
    }
  }

  private hasProgress(): boolean {
    if (!this.state) return false;
    for (let r = 0; r < this.state.size; r++) {
      for (let c = 0; c < this.state.size; c++) {
        if (this.state.grid[r][c] !== 'unknown') {
          const isGiven = this.state.givens.some((g) => g.x === c && g.y === r);
          if (!isGiven) return true;
        }
      }
    }
    return false;
  }

  private async newGame(): Promise<void> {
    if (this.loading) return;
    if (this.state && !this.state.won && this.hasProgress()) {
      if (!confirm('A game is in progress. Start a new game?')) return;
    }
    this.loading = true;
    clearSavedGame();
    closeHelp();

    try {
      const difficulty = getSelectedDifficulty();
      localStorage.setItem(LAST_DIFFICULTY_KEY, difficulty);
      this.state = await startNewGame(difficulty);
      this.refresh();
    } catch (err) {
      console.error(err);
      alert('Could not load a puzzle. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private handleReset(): void {
    if (!this.state) return;
    resetGameState(this.state);
    this.refresh();
  }

  private stashUndo(): void {
    if (!this.state || this.state.won) return;
    const snapshot = this.state.grid.map((row) => [...row]);
    this.state.history.push(snapshot);
    if (this.state.history.length > 30) {
      this.state.history.shift();
    }
  }

  private handleTap(row: number, col: number): void {
    if (!this.state || this.state.won) return;

    const isGiven = this.state.givens.some((g) => g.x === col && g.y === row);
    if (isGiven) {
      if (
        this.state.activeSightline?.x === col &&
        this.state.activeSightline?.y === row
      ) {
        this.state.activeSightline = null;
      } else {
        this.state.activeSightline = { x: col, y: row };
      }
      this.refresh();
      return;
    }

    this.stashUndo();
    const current = this.state.grid[row][col];
    const target = this.placeMode;
    let next: CellState;
    if (current === target) {
      next = 'unknown';
    } else if (current === 'unknown') {
      next = target;
    } else {
      next = 'unknown';
    }
    this.state.grid[row][col] = next;
    this.refresh();
  }

  private handleLongPress(row: number, col: number): void {
    if (!this.state) return;
    const isGiven = this.state.givens.some((g) => g.x === col && g.y === row);
    if (!isGiven) {
      this.state.activeSightline = null;
      this.refresh();
      return;
    }
    this.state.activeSightline = { x: col, y: row };
    this.refresh();
  }

  private toggleSightlines(): void {
    if (!this.state) return;
    this.state.sightlineMode = !this.state.sightlineMode;
    this.refresh();
  }

  private handleModeToggle(): void {
    this.placeMode = this.placeMode === 'black' ? 'white' : 'black';
    setModeButton(this.placeMode);
  }

  private handleUndo(): void {
    if (!this.state || this.state.history.length === 0) return;
    this.state.grid = this.state.history.pop()!;
    this.refresh();
  }

  private handleFillWhite(): void {
    if (!this.state || this.state.won) return;
    let hasUnknown = false;
    for (let r = 0; r < this.state.size; r++) {
      for (let c = 0; c < this.state.size; c++) {
        if (this.state.grid[r][c] === 'unknown') {
          hasUnknown = true;
          break;
        }
      }
      if (hasUnknown) break;
    }
    if (!hasUnknown) return;
    this.stashUndo();
    for (let r = 0; r < this.state.size; r++) {
      for (let c = 0; c < this.state.size; c++) {
        if (this.state.grid[r][c] === 'unknown') {
          this.state.grid[r][c] = 'white';
        }
      }
    }
    this.refresh();
  }

  private handleHint(): void {
    if (!this.state || this.state.won) return;
    const size = this.state.size;
    const sol = this.state.solution;

    let candidates: [number, number][] = [];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (this.state.grid[r][c] === 'unknown' && sol[r * size + c] === '1') {
          candidates.push([r, c]);
        }
      }
    }
    if (candidates.length === 0) {
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (this.state.grid[r][c] === 'unknown' && sol[r * size + c] === '0') {
            candidates.push([r, c]);
          }
        }
      }
    }
    if (candidates.length === 0) return;

    const [row, col] = candidates[Math.floor(Math.random() * candidates.length)];
    this.stashUndo();
    this.state.grid[row][col] = sol[row * size + col] === '1' ? 'black' : 'white';
    this.refresh();
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (document.querySelector('#help-dialog')) {
      if (e.key === 'Escape') closeHelp();
      return;
    }
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
    if (!this.state || this.state.won) return;
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      this.handleUndo();
    }
  }

  private computeMistakes(): number {
    if (!this.state) return 0;
    const conflictSet = new Set<string>();
    for (const { row, col } of getAdjacentBlackConflicts(this.state.grid)) {
      conflictSet.add(`${row},${col}`);
    }
    for (const g of getViolatedGivens(this.state.grid, this.state.givens)) {
      conflictSet.add(`${g.y},${g.x}`);
    }
    return conflictSet.size;
  }

  private refresh(): void {
    if (!this.state) return;

    renderBoard(this.board, this.state);

    const mistakes = this.computeMistakes();
    this.state.mistakes = mistakes;
    updateMistakes(mistakes);
    updatePuzzleId(this.state.puzzleId);
    setUndoEnabled(this.state.history.length > 0);
    setHintEnabled(!this.state.won);
    updateDifficultyLabel(
      this.state.difficulty.charAt(0).toUpperCase() + this.state.difficulty.slice(1),
    );

    if (!this.state.won && isWin(this.state.grid, this.state.givens)) {
      this.state.won = true;
      showWinBanner(true);
      clearSavedGame();
      renderBoard(this.board, this.state);
    } else if (!this.state.won) {
      showWinBanner(false);
      saveGame(this.state);
    }
  }
}

export async function bootstrap(): Promise<void> {
  const app = new SightlineApp();
  await app.init();
}
