import { MapDefinition } from './types';

/** V0.22 — Masmorra do Guardião */
const W = 36;
const H = 30;
const TILE = 32;

function buildDungeon(): MapDefinition {
  const tiles: number[][] = [];
  const collision: boolean[][] = [];

  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    collision[y] = [];
    for (let x = 0; x < W; x++) {
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        tiles[y][x] = 1;
        collision[y][x] = true;
      } else if (x < 3 || y < 3 || x > W - 4 || y > H - 4) {
        tiles[y][x] = 4;
        collision[y][x] = false;
      } else if (
        ((x === 8 || x === 9 || x === W - 9 || x === W - 10) && y > 8 && y < H - 9) ||
        ((y === 8 || y === 9 || y === H - 9 || y === H - 10) && x > 8 && x < W - 9)
      ) {
        tiles[y][x] = 1;
        collision[y][x] = true;
      } else {
        tiles[y][x] = 5;
        collision[y][x] = false;
      }
    }
  }

  // Openings into arena
  for (let x = 15; x <= 20; x++) {
    tiles[9][x] = 5;
    collision[9][x] = false;
    tiles[H - 10][x] = 5;
    collision[H - 10][x] = false;
  }
  for (let y = 12; y <= 17; y++) {
    tiles[y][9] = 5;
    collision[y][9] = false;
    tiles[y][W - 10] = 5;
    collision[y][W - 10] = false;
  }

  // Portal tile visual near west corridor
  const px = 2;
  const py = 14;
  tiles[py][px] = 4;
  collision[py][px] = false;
  tiles[py][px + 1] = 4;
  collision[py][px + 1] = false;

  return {
    id: 'dungeon',
    name: 'Masmorra do Guardião',
    width: W,
    height: H,
    tileSize: TILE,
    bgColor: 0x1c1917,
    tiles,
    collision,
    portals: [
      // Back to forest (east edge of forest)
      { x: px, y: py, targetMap: 'forest', targetX: 44 * 32, targetY: 20 * 32 },
      { x: px + 1, y: py, targetMap: 'forest', targetX: 44 * 32, targetY: 20 * 32 },
    ],
    spawns: [{ x: 4 * TILE, y: 14 * TILE }],
  };
}

export const dungeonMap = buildDungeon();
