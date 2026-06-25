const TUTORIAL_SIZE = 6;

// Solution for the finished tutorial board (coordinate strings "r,c")
const TUTORIAL_BLACKS = new Set([
  "0,5", "1,1", "1,4", "2,2", "3,3", "4,4", "5,0",
]);

// fmt: '?'=unknown, 'W'=white (non-given), 'B'=black, 'G'=given (white with number)
const TUTORIAL_STATES = [
  {
    label:
      'Before — only the numbered cells are visible clues. Every other cell is unknown (gray). Your job is to mark the rest either white or black.',
    grid: [
      '??????',
      '??????',
      '??????',
      '??????',
      '??????',
      '??????',
    ],
    sightlineRoot: null as { x: number; y: number } | null,
  },
  {
    label:
      'What a number means — from this " 2 ", highlighted cells show what it counts. Down and left are blocked by black cells, leaving two visible whites: one above and one to the right.',
    grid: [
      '??????',
      '??????',
      '??????',
      '??????',
      '??????',
      '??????',
    ],
    sightlineRoot: { x: 2, y: 1 },
  },
  {
    label:
      'Finished — every number matches its visible count, no black cells touch, and all white cells connect.',
    grid: [
      'WGWGWB',
      'WBGWBW',
      'GWBWWW',
      'WWWBGW',
      'WWWWBW',
      'BWGWWG',
    ],
    sightlineRoot: null,
  },
];

// placed on white backgrounds at fixed coordinates
const TUTORIAL_GIVENS: { x: number; y: number; value: number }[] = [
  { x: 1, y: 0, value: 4 },
  { x: 3, y: 0, value: 6 },
  { x: 2, y: 1, value: 2 },
  { x: 0, y: 2, value: 5 },
  { x: 4, y: 3, value: 2 },
  { x: 2, y: 5, value: 6 },
  { x: 5, y: 5, value: 8 },
];

function getSightlineCells(root: { x: number; y: number } | null, size: number): Set<string> {
  const cells = new Set<string>();
  if (!root) return cells;
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    let r = root.y + dr;
    let c = root.x + dc;
    while (r >= 0 && r < size && c >= 0 && c < size) {
      cells.add(`${r},${c}`);
      if (TUTORIAL_BLACKS.has(`${r},${c}`)) break;
      r += dr;
      c += dc;
    }
  }
  return cells;
}

function makeMiniBoard(state: (typeof TUTORIAL_STATES)[number]): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'tutorial-board-wrapper';

  const grid = document.createElement('div');
  grid.className = 'mini-board';
  grid.style.setProperty('--mini-n', String(TUTORIAL_SIZE));
  grid.style.gridTemplateColumns = `repeat(${TUTORIAL_SIZE}, 1fr)`;

  const hl = getSightlineCells(state.sightlineRoot, TUTORIAL_SIZE);

  for (let r = 0; r < TUTORIAL_SIZE; r++) {
    for (let c = 0; c < TUTORIAL_SIZE; c++) {
      const cell = document.createElement('div');
      cell.className = 'mini-cell';
      const code = state.grid[r][c];
      const g = TUTORIAL_GIVENS.find((v) => v.x === c && v.y === r)?.value ?? null;
      const key = `${r},${c}`;

      if (code === 'G' || g !== null) {
        cell.classList.add('given');
      } else if (code === 'B') {
        cell.classList.add('black');
      } else if (code === 'W') {
        cell.classList.add('white');
      }
      if (hl.has(key)) {
        cell.classList.add('sightline-demo');
      }
      if (state.sightlineRoot && state.sightlineRoot.x === c && state.sightlineRoot.y === r) {
        cell.classList.add('sightline-root');
      }
      if (g !== null) {
        cell.textContent = String(g);
      }
      grid.appendChild(cell);
    }
  }

  const caption = document.createElement('p');
  caption.className = 'tutorial-caption';
  caption.textContent = state.label;

  wrapper.appendChild(grid);
  wrapper.appendChild(caption);
  return wrapper;
}

export function openHelp(): void {
  if (document.getElementById('help-dialog')) return;

  const dialog = document.createElement('div');
  dialog.id = 'help-dialog';

  const inner = document.createElement('div');
  inner.className = 'help-inner';
  inner.innerHTML = `
    <h2 style="margin-top:0;font-size:1.25rem;">How to play Sightline</h2>
    <p><strong>Goal:</strong> Shade cells black so every numbered cell sees exactly its number of white cells in the four cardinal directions.</p>
    <ul style="padding-left:18px;margin:8px 0;">
      <li>Shaded (black) cells cannot touch orthogonally.</li>
      <li>All white cells must connect orthogonally.</li>
      <li>Numbers show how many white cells are visible in a line until a black cell or the grid edge blocks the view.</li>
    </ul>
    <p><strong>Controls:</strong></p>
    <ul style="padding-left:18px;margin:8px 0;">
      <li>Use the ■/□ toggle to choose whether your tap places black or white. Tapping again returns the cell to unknown.</li>
      <li>Numbered cells are always white and cannot be changed.</li>
      <li>Long-press a numbered cell to highlight its four sightlines.</li>
      <li>Tap <em>Sightlines</em> to show current count vs target on every number.</li>
    </ul>
    <h3 style="margin-top:12px;font-size:1.1rem;">Visual walkthrough</h3>
  `;

  const walkthrough = document.createElement('div');
  walkthrough.className = 'tutorial-walkthrough';

  TUTORIAL_STATES.forEach((state) => {
    walkthrough.appendChild(makeMiniBoard(state));
  });

  inner.appendChild(walkthrough);

  const closeBtn = document.createElement('button');
  closeBtn.id = 'close-help';
  closeBtn.className = 'btn btn-primary';
  closeBtn.style.cssText = 'margin-top:10px;width:100%';
  closeBtn.textContent = 'Close';
  closeBtn.addEventListener('click', () => dialog.remove());
  inner.appendChild(closeBtn);

  const overlay = document.createElement('div');
  overlay.className = 'help-overlay';
  overlay.appendChild(inner);
  dialog.appendChild(overlay);

  dialog.addEventListener('click', (e) => {
    if (e.target === overlay) dialog.remove();
  });

  document.body.appendChild(dialog);
}

export function closeHelp(): void {
  document.getElementById('help-dialog')?.remove();
}
