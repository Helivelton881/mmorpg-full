/** Map system types - V0.4 */

export interface MapPortal {
  /** Tile coordinates where the portal is */
  x: number;
  y: number;
  /** Target map id */
  targetMap: string;
  /** Spawn position on target map (pixel coords) */
  targetX: number;
  targetY: number;
}

export interface MapSpawn {
  x: number; // pixel
  y: number;
}

export interface MapDefinition {
  id: string;
  name: string;
  /** Width and height in tiles */
  width: number;
  height: number;
  tileSize: number;
  /** 0 = walkable grass, 1 = blocked, 2 = water, 3 = path, 4 = portal visual */
  tiles: number[][];
  /** Collision: true = blocked */
  collision: boolean[][];
  portals: MapPortal[];
  spawns: MapSpawn[];
  /** Background color */
  bgColor: number;
}

export interface MapTransferPayload {
  mapId: string;
  x: number;
  y: number;
}
