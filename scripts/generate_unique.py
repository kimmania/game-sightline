#!/usr/bin/env python3
"""Generate one unique medium puzzle to replace medium-0210."""
import json, os, sys, time, random
from collections import Counter, deque

sys.setrecursionlimit(50000)
DIR = '/Users/kmann/Documents/GitHub/kimmania/game-sightline/'
random.seed()

# Inline generator code
def is_white_connected(black):
    size = len(black)
    start=None
    for r in range(size):
        for c in range(size):
            if not black[r][c]:
                start=(r,c)
                break
        if start:
            break
    if start is None:
        return False
    visited={start}
    q=deque([start])
    while q:
        r,c=q.popleft()
        for dr,dc in ((-1,0),(1,0),(0,-1),(0,1)):
            nr,nc=r+dr,c+dc
            if 0<=nr<size and 0<=nc<size and not black[nr][nc] and (nr,nc) not in visited:
                visited.add((nr,nc))
                q.append((nr,nc))
    white_count=sum(not black[r][c] for r in range(size) for c in range(size))
    return len(visited)==white_count

def generate_black_pattern(size):
    for _ in range(2000):
        black = [[False]*size for _ in range(size)]
        positions=[(r,c) for r in range(size) for c in range(size)]
        random.shuffle(positions)
        lo=max(2,int(size*size*0.18))
        hi=int(size*size*0.38)
        target_blacks=random.randint(lo,hi)
        placed=0
        for r,c in positions:
            if placed>=target_blacks:
                break
            ok=True
            for dr,dc in ((-1,0),(1,0),(0,-1),(0,1)):
                nr,nc=r+dr,c+dc
                if 0<=nr<size and 0<=nc<size and black[nr][nc]:
                    ok=False
                    break
            if not ok:
                continue
            black[r][c]=True
            if not is_white_connected(black):
                black[r][c]=False
                continue
            placed+=1
        if is_white_connected(black) and placed>=max(2,size//2):
            return black
    return None

def compute_sightlines(black):
    size=len(black)
    counts=[[-1]*size for _ in range(size)]
    for r in range(size):
        for c in range(size):
            if black[r][c]:
                continue
            total=0
            for dr,dc in ((-1,0),(1,0),(0,-1),(0,1)):
                nr,nc=r+dr,c+dc
                while 0<=nr<size and 0<=nc<size:
                    if black[nr][nc]:
                        break
                    total+=1
                    nr+=dr
                    nc+=dc
            counts[r][c]=total
    return counts

def select_givens(black, counts, min_g, max_g):
    size=len(black)
    candidates=[]
    for r in range(size):
        for c in range(size):
            if black[r][c]:
                continue
            score=0
            if r==0 or r==size-1:
                score+=8
            if c==0 or c==size-1:
                score+=8
            v=counts[r][c]
            if v<=2:
                score+=20
            elif v<=size:
                score+=10
            elif v>=size*3:
                score+=12
            candidates.append((score,r,c,v))
    candidates.sort(key=lambda x:(-x[0], random.random()))
    num=random.randint(min_g,max_g)
    selected=candidates[:num]
    selected.sort(key=lambda x:(x[1], x[2]))
    return [{"x":c, "y":r, "value":v} for _,r,c,v in selected]

# Solver for uniqueness
DIRS = [(-1,0),(1,0),(0,-1),(0,1)]

def is_unique(pz, cap=200000, max_time=5):
    size = pz['size']
    givens = pz['givens']
    gs = {(g['x'], g['y']): g['value'] for g in givens}
    unknowns=[(x,y) for y in range(size) for x in range(size) if (x,y) not in gs]
    occ=Counter()
    for gx,gy in gs:
        for dx,dy in DIRS:
            nx, ny = gx+dx, gy+dy
            while 0<=nx<size and 0<=ny<size:
                if (nx,ny) not in gs:
                    occ[(nx,ny)] += 1
                nx+=dx; ny+=dy
    unknowns.sort(key=lambda p:(-occ.get(p,0), p[1], p[0]))
    
    def bounds(grid, x, y):
        mn=mx=0
        for dx,dy in DIRS:
            nx, ny = x+dx, y+dy
            while 0<=nx<size and 0<=ny<size:
                c = grid[ny][nx]
                if c==1: break
                if c==-1: break
                mn+=1
                nx+=dx; ny+=dy
            nx, ny = x+dx, y+dy
            while 0<=nx<size and 0<=ny<size:
                c = grid[ny][nx]
                if c==1: break
                mx+=1
                nx+=dx; ny+=dy
        return mn, mx
    
    def prune(grid):
        for (x,y), val in gs.items():
            lo,hi = bounds(grid, x, y)
            if hi<val or lo>val:
                return False
        for y in range(size):
            for x in range(size):
                if grid[y][x]==1:
                    for dx,dy in DIRS:
                        nx, ny = x+dx, y+dy
                        if 0<=nx<size and 0<=ny<size and grid[ny][nx]==1:
                            return False
        return True
    
    def connected(grid):
        start=None
        for y in range(size):
            for x in range(size):
                if grid[y][x]!=1:
                    start=(x,y); break
            if start: break
        if not start: return False
        visited={start}
        q=deque([start])
        while q:
            x,y=q.popleft()
            for dx,dy in DIRS:
                nx, ny = x+dx, y+dy
                if 0<=nx<size and 0<=ny<size and grid[ny][nx]!=1 and (nx,ny) not in visited:
                    visited.add((nx,ny))
                    q.append((nx,ny))
        white = sum(1 for row in grid for c in row if c!=1)
        return len(visited)==white
    
    def sightline_count(grid,x,y):
        total=0
        for dx,dy in DIRS:
            nx, ny = x+dx, y+dy
            while 0<=nx<size and 0<=ny<size:
                if grid[ny][nx]==1: break
                total+=1
                nx+=dx; ny+=dy
        return total
    
    sols=[]
    calls=0
    grid=[[-1]*size for _ in range(size)]
    for x,y in gs:
        grid[y][x]=0
    
    def back(idx):
        nonlocal calls
        calls+=1
        if calls > cap:
            return
        if len(sols)>=2:
            return
        if idx==len(unknowns):
            for (x,y),val in gs.items():
                if sightline_count(grid,x,y)!=val:
                    return
            if not connected(grid):
                return
            sols.append(''.join('1' if grid[y][x]==1 else '0' for y in range(size) for x in range(size)))
            return
        x,y=unknowns[idx]
        for v in (0,1):
            grid[y][x]=v
            if prune(grid):
                back(idx+1)
            grid[y][x]=-1
    
    start = time.time()
    back(0)
    elapsed = time.time()-start
    unique = (len(sols)==1)
    print(f"    unique={unique} sols={len(sols)} calls={calls} time={elapsed:.2f}s")
    return unique

def main():
    size = 10
    min_g = 10
    max_g = 18
    for attempt in range(1, 501):
        black = generate_black_pattern(size)
        if black is None:
            continue
        counts = compute_sightlines(black)
        givens = select_givens(black, counts, min_g, max_g)
        sol_str = ''.join('1' if black[r][c] else '0' for r in range(size) for c in range(size))
        pz = {"size": size, "givens": givens, "solution": sol_str}
        print(f"Attempt {attempt} ...", end="")
        if is_unique(pz):
            print(f"SUCCESS! Givens={len(givens)}")
            print(json.dumps(pz))
            # Replace medium-0210 in medium.json
            # Also ensure solution string is not duplicated
            with open(DIR + 'public/puzzles/medium.json') as f:
                data = json.load(f)
            # Overwrite medium-0210
            for p in data:
                if p['id'] == 'medium-0210':
                    p['size'] = pz['size']
                    p['givens'] = pz['givens']
                    p['solution'] = pz['solution']
                    # keep id unchanged
                    break
            with open(DIR + 'public/puzzles/medium.json', 'w') as f:
                json.dump(data, f)
            print("Wrote new medium-0210 into medium.json")
            return
    print("Failed after 500 attempts")

if __name__ == '__main__':
    main()
