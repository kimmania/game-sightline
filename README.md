# Sightline

A Kurodoko ("Where is Black Cells?") shading puzzle built as a mobile-first PWA.

Play at: `https://kimmania.github.io/game-sightline/`

## How to play

The goal is to shade cells black so every numbered cell sees exactly the listed count of white cells in the four cardinal directions.

- **Black cells** cannot be orthogonally adjacent.
- **White cells** must all be orthogonally connected.
- **Numbers** show how many white cells are visible in a straight line until a black cell or grid edge blocks the view.

### Controls
- Tap a cell to cycle: **unknown → white → black**.
- Numbered cells are always white and cannot be changed.
- Long-press a numbered cell to highlight its four sightlines.
- Tap **Sightlines** to show current visible count vs target on every number.

### Difficulty levels
- **Easy** — 8×8 grid
- **Medium** — 10×10 grid
- **Hard** — 12×12 grid
- **Expert** — 14×14 grid

Each difficulty has 500 puzzles. Your recent puzzle history is saved locally so you won’t see the same puzzle too often.

## Development

```bash
npm install
npm run generate-puzzles   # regenerates public/puzzles/*.json
npm run dev                # local dev server
npm run build              # production build to dist/
```

## Deploy

Pushes to `main` automatically deploy to GitHub Pages via the included Actions workflow.
