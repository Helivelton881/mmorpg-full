import { MapDefinition } from './types';

/** Dark Forest - mid-level area */
const W = 50;
const H = 40;
const TILE = 32;

function buildForest(): MapDefinition {
  const tiles: number[][] = [];
  const collision: boolean[][] = [];

  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    collision[y] = [];
    for (let x = 0; x < W; x++) {
      // Border walls
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) {
        tiles[y][x] = 1; // wall
        collision[y][x] = true;
      } else if ((x + y) % 7 === 0 && x > 3 && y > 3 && x < W - 4 && y < H - 4) {
        tiles[y][x] = 3; // tree / obstacle
        collision[y][x] = true;
      } else if (y > H / 2 && (x * 3 + y) % 11 === 0) {
        tiles[y][x] = 2; // dark grass variant
        collision[y][x] = false;
      } else {
        tiles[y][x] = 0; // grass
        collision[y][x] = false;
      }
    }
  }

  // Clear spawn area
  for (let y = 16; y <= 22; y++) {
    for (let x = 3; x <= 8; x++) {
      tiles[y][x] = 0;
      collision[y][x] = false;
    }
  }

  // Clear path to portal back
  for (let x = 1; x <= 6; x++) {
    tiles[18][x] = 0;
    collision[18][x] = false;
  }

  // Clear collision for dungeon portal
  for (const [px, py] of [[46, 20], [47, 20], [45, 20], [47, 19], [47, 21]]) {
    if (tiles[py] && tiles[py][px] !== undefined) {
      tiles[py][px] = 3;
      collision[py][px] = false;
    }
  }

  return {
    id: 'forest',
    name: 'Floresta Sombria',
    width: W,
    height: H,
    tileSize: TILE,
    bgColor: 0x0f2d1a,
    tiles,
    collision,
    portals: [
      // Back to field
      { x: 2, y: 18, targetMap: 'field', targetX: 1200, targetY: 400 },
      // V0.22 — Masmorra
      { x: 47, y: 20, targetMap: 'dungeon', targetX: 4 * 32, targetY: 14 * 32 },
      { x: 46, y: 20, targetMap: 'dungeon', targetX: 4 * 32, targetY: 14 * 32 },
    ],
    spawns: [{ x: 160, y: 600 }],
  };
}

export const forestMap = buildForest();
