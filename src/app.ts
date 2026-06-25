import type { CellState, GameState } from './sightline/types';
import { fetchBank, resetGameState, startNewGame } from './sightline/puzzle';
import { clearSavedGame, loadSavedGame, saveGame } from './sightline/storage';
import { getAdjacentBlackConflicts, getViolatedGivens, isWin } from './sightline/validator';
import { bindBoardInteractions, createBoard, renderBoard } from './ui/board';
import {
  bindControlHandlers,
  getSelectedDifficulty,
  setDifficulty,
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
  private previousGrid: CellState[][] | null = null;
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
    });

    setModeButton(this.placeMode);

    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    const saved = loadSavedGame();
    if (saved && !saved.won) {
      this.state = saved;
      setDifficulty(saved.difficulty);
      this.refresh();
    } else {
      await this.newGame();
    }

    if (!localStorage.getItem('sightline-has-seen-help')) {
      openHelp();
      localStorage.setItem('sightline-has-seen-help', '1');
    }
  }

  private async newGame(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    clearSavedGame();
    this.previousGrid = null;
    closeHelp();

    try {
      const difficulty = getSelectedDifficulty();
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
    this.previousGrid = null;
    this.refresh();
  }

  private stashUndo(): void {
    if (!this.state || this.state.won) return;
    this.previousGrid = this.state.grid.map((row) => [...row]);
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
    if (!this.state || !this.previousGrid) return;
    this.state.grid = this.previousGrid;
    this.previousGrid = null;
    this.refresh();
  }

  private handleFillWhite(): void {
    if (!this.state || this.state.won) return;
    let changed = false;
    for (let r = 0; r < this.state.grid.length; r++) {
      for (let c = 0; c < this.state.grid[r].length; c++) {
        if (this.state.grid[r][c] === 'unknown') {
          changed = true;
          if (!changed) break;
        }
      }
      if (changed) break;
    }
    if (!changed) return;
    this.stashUndo();
    for (let r = 0; r < this.state.grid.length; r++) {
      for (let c = 0; c < this.state.grid[r].length; c++) {
        if (this.state.grid[r][c] === 'unknown') {
          this.state.grid[r][c] = 'white';
        }
      }
    }
    this.refresh();
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (document.querySelector('#help-dialog')) {
      if (e.key === 'Escape') closeHelp();
      return;
    }
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
    setUndoEnabled(this.previousGrid !== null);
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
