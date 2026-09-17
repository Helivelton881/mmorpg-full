export interface Vector2 { x: number; y: number; }

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  direction: Direction;
  className?: string;
  mapId?: string;
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  level?: number;
  experience?: number;
  alive?: boolean;
}

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export interface InputPayload {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack?: boolean;
}
