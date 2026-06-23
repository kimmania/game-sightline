#!/usr/bin/env python3
"""Generate Kurodoko (Sightline) puzzle banks."""

import json
import os
import random
from collections import deque
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DIFFICULTY = {
    "easy":   {"size": 8,  "min_givens": 8,  "max_givens": 14},
    "medium": {"size": 10, "min_givens": 10, "max_givens": 18},
    "hard":   {"size": 12, "min_givens": 12, "max_givens": 20},
    "expert": {"size": 14, "min_givens": 14, "max_givens": 24},
}
TARGET = 500
OUTDIR = Path(__file__).resolve().parent.parent / "public" / "puzzles"
OUTDIR.mkdir(parents=True, exist_ok=True)

random.seed(42)


def is_white_connected(black):
    size = len(black)
    start = None
    for r in range(size):
        for c in range(size):
            if not black[r][c]:
                start = (r, c)
                break
        if start:
            break
    if start is None:
        return False
    visited = {start}
    q = deque([start])
    while q:
        r, c = q.popleft()
        for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size and not black[nr][nc] and (nr, nc) not in visited:
                visited.add((nr, nc))
                q.append((nr, nc))
    white_count = sum(not black[r][c] for r in range(size) for c in range(size))
    return len(visited) == white_count


def generate_black_pattern(size):
    """Random greedy placement of black cells."""
    for _ in range(2000):
        black = [[False] * size for _ in range(size)]
        positions = [(r, c) for r in range(size) for c in range(size)]
        random.shuffle(positions)
        lo = max(2, int(size * size * 0.18))
        hi = int(size * size * 0.38)
        target_blacks = random.randint(lo, hi)
        placed = 0
        for r, c in positions:
            if placed >= target_blacks:
                break
            ok = True
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r + dr, c + dc
                if 0 <= nr < size and 0 <= nc < size and black[nr][nc]:
                    ok = False
                    break
            if not ok:
                continue
            black[r][c] = True
            if not is_white_connected(black):
                black[r][c] = False
                continue
            placed += 1
        if is_white_connected(black) and placed >= max(2, size // 2):
            return black
    return None


def compute_sightlines(black):
    size = len(black)
    counts = [[-1] * size for _ in range(size)]
    for r in range(size):
        for c in range(size):
            if black[r][c]:
                continue
            total = 0
            for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nr, nc = r + dr, c + dc
                while 0 <= nr < size and 0 <= nc < size:
                    if black[nr][nc]:
                        break
                    total += 1
                    nr += dr
                    nc += dc
            counts[r][c] = total
    return counts


def select_givens(black, counts, min_g, max_g):
    size = len(black)
    # Select high-value givens that are spread out
    candidates = []
    for r in range(size):
        for c in range(size):
            if black[r][c]:
                continue
            score = 0
            if r == 0 or r == size - 1:
                score += 8
            if c == 0 or c == size - 1:
                score += 8
            v = counts[r][c]
            if v <= 2:
                score += 20
            elif v <= size:
                score += 10
            elif v >= size * 3:
                score += 12
            candidates.append((score, r, c, v))
    candidates.sort(key=lambda x: (-x[0], random.random()))
    num = random.randint(min_g, max_g)
    selected = candidates[:num]
    # sort by reading order for deterministic JSON
    selected.sort(key=lambda x: (x[1], x[2]))
    return [{"x": c, "y": r, "value": v} for _, r, c, v in selected]


# ---------------------------------------------------------------------------
# Fast sanity: propagation solver
# ---------------------------------------------------------------------------

def propagate_and_score(givens, black, size):
    """
    Run simple constraint propagation to see how many cells are forced.
    Returns number of forced cells (higher = more constrained puzzle).
    """
    grid = [[-1] * size for _ in range(size)]  # -1 unknown, 0 white, 1 black
    # Given cells are white
    for g in givens:
        grid[g["y"]][g["x"]] = 0

    changed = True
    iterations = 0
    while changed and iterations < 30:
        changed = False
        iterations += 1

        # Adjacent black rule propagation
        for r in range(size):
            for c in range(size):
                if grid[r][c] == 1:
                    for dr, dc in ((-1,0),(1,0),(0,-1),(0,1)):
                        nr, nc = r+dr, c+dc
                        if 0 <= nr < size and 0 <= nc < size and grid[nr][nc] == -1:
                            grid[nr][nc] = 0
                            changed = True

        # Numbered cell constraints
        for g in givens:
            c, r, target = g["x"], g["y"], g["value"]
            known_white = 0
            unknown_positions = []
            for dr, dc in ((-1,0),(1,0),(0,-1),(0,1)):
                rr, cc = r+dr, c+dc
                while 0 <= rr < size and 0 <= cc < size:
                    if grid[rr][cc] == 1:
                        break
                    if grid[rr][cc] == -1:
                        unknown_positions.append((rr, cc))
                        rr += dr
                        cc += dc
                        continue
                    known_white += 1
                    rr += dr
                    cc += dc

            if known_white == target and unknown_positions:
                for ur, uc in unknown_positions:
                    if grid[ur][uc] == -1:
                        grid[ur][uc] = 1
                        changed = True
            elif known_white + len(unknown_positions) == target and unknown_positions:
                for ur, uc in unknown_positions:
                    if grid[ur][uc] == -1:
                        grid[ur][uc] = 0
                        changed = True

    forced = sum(1 for r in range(size) for c in range(size) if grid[r][c] != -1)
    return forced


def generate_one(size, min_g, max_g):
    for _ in range(200):
        black = generate_black_pattern(size)
        if black is None:
            continue
        counts = compute_sightlines(black)
        givens = select_givens(black, counts, min_g, max_g)

        # Sanity: ensure givens cover a reasonable area and propagate somewhat
        forced = propagate_and_score(givens, black, size)
        # We want at least some forced cells to ensure puzzle isn't completely unconstrained
        if forced < len(givens) + size:
            # Too few deductions; try different givens selection once
            givens = select_givens(black, counts, min_g, max_g)
            forced = propagate_and_score(givens, black, size)
            if forced < len(givens) + size:
                continue

        solution_str = "".join("1" if black[r][c] else "0" for r in range(size) for c in range(size))
        return {
            "size": size,
            "givens": givens,
            "solution": solution_str,
        }
    return None


def generate_bank(difficulty, info, target):
    size = info["size"]
    min_g = info["min_givens"]
    max_g = info["max_givens"]
    puzzles = []
    seen = set()
    attempts = 0
    max_attempts = target * 30

    while len(puzzles) < target and attempts < max_attempts:
        attempts += 1
        p = generate_one(size, min_g, max_g)
        if p is None:
            continue
        # dedupe by solution string
        if p["solution"] in seen:
            continue
        seen.add(p["solution"])
        puzzle_id = f"{difficulty}-{str(len(puzzles) + 1).zfill(4)}"
        p["id"] = puzzle_id
        puzzles.append(p)
        if len(puzzles) % 50 == 0:
            print(f"  {difficulty}: {len(puzzles)}/{target}")

    return puzzles


if __name__ == "__main__":
    for diff, info in DIFFICULTY.items():
        print(f"Generating {diff} ({info['size']}x{info['size']}) ...")
        puzzles = generate_bank(diff, info, TARGET)
        filename = OUTDIR / f"{diff}.json"
        with open(filename, "w") as f:
            json.dump(puzzles, f)
        print(f"  Wrote {len(puzzles)} puzzles to {filename}")
