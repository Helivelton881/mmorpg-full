import { starterMap } from './starter';
import { fieldMap } from './field';
import { forestMap } from './forest';
import { dungeonMap } from './dungeon';
import { MapDefinition } from './types';

export * from './types';

export const maps: Record<string, MapDefinition> = {
  starter: starterMap,
  field: fieldMap,
  forest: forestMap,
  dungeon: dungeonMap,
};

export function getMap(id: string): MapDefinition {
  return maps[id] || maps.starter;
}

export function getAllMapIds(): string[] {
  return Object.keys(maps);
}
