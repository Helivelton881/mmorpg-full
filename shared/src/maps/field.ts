import { MapDefinition } from './types';

const W = 50;
const H = 35;
const TS = 32;

function makeGrid(w: number, h: number, fill: number): number[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function makeCollision(w: number, h: number, fill = false): boolean[][] {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

/** Campo Aberto - second map */
export const fieldMap: MapDefinition = {
  id: 'field',
  name: 'Campo Aberto',
  width: W,
  height: H,
  tileSize: TS,
  bgColor: 0x3a7a35,
  tiles: makeGrid(W, H, 0),
  collision: makeCollision(W, H, false),
  portals: [
    {
      x: 1,
      y: 15,
      targetMap: 'starter',
      targetX: 36 * 32,
      targetY: 14 * 32 + 16,
    },
    {
      x: 38,
      y: 12,
      targetMap: 'forest',
      targetX: 160,
      targetY: 600,
    },
  ],
  spawns: [
    { x: 100, y: 480 },
    { x: 150, y: 500 },
  ],
};

(function build() {
  const t = fieldMap.tiles;
  const c = fieldMap.collision;

  // Soft border (trees)
  for (let x = 0; x < W; x++) {
    t[0][x] = 1; c[0][x] = true;
    t[H - 1][x] = 1; c[H - 1][x] = true;
  }
  for (let y = 0; y < H; y++) {
    t[y][0] = 1; c[y][0] = true;
    t[y][W - 1] = 1; c[y][W - 1] = true;
  }

  // Path
  for (let x = 2; x < W - 2; x++) {
    t[15][x] = 3;
    t[16][x] = 3;
  }

  // Rocks / trees clusters
  function block(tx: number, ty: number, tw: number, th: number) {
    for (let y = ty; y < ty + th; y++) {
      for (let x = tx; x < tx + tw; x++) {
        if (y > 0 && y < H - 1 && x > 0 && x < W - 1) {
          t[y][x] = 1;
          c[y][x] = true;
        }
      }
    }
  }

  block(8, 5, 3, 3);
  block(20, 8, 4, 2);
  block(35, 6, 3, 3);
  block(12, 22, 3, 3);
  block(30, 24, 4, 3);
  block(40, 18, 3, 2);

  // Small water
  for (let y = 10; y <= 13; y++) {
    for (let x = 25; x <= 29; x++) {
      t[y][x] = 2;
      c[y][x] = true;
    }
  }

  // Portal back to village
  t[15][1] = 4;
  t[16][1] = 4;
  c[15][1] = false;
  c[16][1] = false;
  c[15][0] = false;
  c[16][0] = false;
  t[15][0] = 4;
  t[16][0] = 4;

  // Portal to forest
  t[12][38] = 4;
  t[13][38] = 4;
  t[12][37] = 4;
  c[12][38] = false;
  c[13][38] = false;
  c[12][37] = false;
  c[13][37] = false;
})();
