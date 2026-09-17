import { MapDefinition } from './types';

const W = 40;
const H = 30;
const TS = 32;

function makeGrid(w: number, h: number, fill: number): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function makeCollision(w: number, h: number, fill = false): boolean[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

/** Vila Inicial - starter map */
export const starterMap: MapDefinition = {
  id: 'starter',
  name: 'Vila Inicial',
  width: W,
  height: H,
  tileSize: TS,
  bgColor: 0x2d5a27,
  tiles: makeGrid(W, H, 0),
  collision: makeCollision(W, H, false),
  portals: [
    {
      x: 38,
      y: 14,
      targetMap: 'field',
      targetX: 64,
      targetY: 480,
    },
  ],
  spawns: [
    { x: 400, y: 400 },
    { x: 450, y: 420 },
    { x: 380, y: 380 },
  ],
};

// Build a simple village layout
(function build() {
  const t = starterMap.tiles;
  const c = starterMap.collision;

  // Border walls
  for (let x = 0; x < W; x++) {
    t[0][x] = 1; c[0][x] = true;
    t[H - 1][x] = 1; c[H - 1][x] = true;
  }
  for (let y = 0; y < H; y++) {
    t[y][0] = 1; c[y][0] = true;
    t[y][W - 1] = 1; c[y][W - 1] = true;
  }

  // Path (horizontal)
  for (let x = 2; x < W - 2; x++) {
    t[14][x] = 3;
    t[15][x] = 3;
  }

  // Path vertical
  for (let y = 2; y < H - 2; y++) {
    t[y][10] = 3;
    t[y][11] = 3;
  }

  // Houses (blocked rectangles)
  function house(tx: number, ty: number, tw: number, th: number) {
    for (let y = ty; y < ty + th; y++) {
      for (let x = tx; x < tx + tw; x++) {
        if (y >= 0 && y < H && x >= 0 && x < W) {
          t[y][x] = 1;
          c[y][x] = true;
        }
      }
    }
  }

  house(4, 4, 5, 4);
  house(16, 5, 6, 5);
  house(26, 4, 5, 4);
  house(5, 20, 5, 4);
  house(18, 19, 6, 5);
  house(28, 20, 5, 4);

  // Water pond
  for (let y = 8; y <= 11; y++) {
    for (let x = 22; x <= 26; x++) {
      t[y][x] = 2;
      c[y][x] = true;
    }
  }

  // Portal visual
  t[14][38] = 4;
  t[15][38] = 4;
  // Portal is walkable
  c[14][38] = false;
  c[15][38] = false;

  // Open east exit for portal
  c[14][W - 1] = false;
  c[15][W - 1] = false;
  t[14][W - 1] = 4;
  t[15][W - 1] = 4;
})();
