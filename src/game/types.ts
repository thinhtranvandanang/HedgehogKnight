export type GameState =
  | 'TITLE_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'STAGE_CLEAR'
  | 'GAME_OVER'
  | 'VICTORY';

export type AnimationState = 'idle' | 'run' | 'jump' | 'fall' | 'victory';

export interface InputState {
  left: boolean;
  right: boolean;
  jumpHeld: boolean;
  jumpPressedThisFrame: boolean;
  attackPressedThisFrame: boolean;
}

export interface PlatformDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Optional horizontal or vertical patrol range for moving platforms */
  moveX?: number;
  moveY?: number;
  moveSpeed?: number;
}

export interface PlatformRuntime extends PlatformDef {
  originX: number;
  originY: number;
  dx: number;
  dy: number;
  phase: number;
}

export interface AcornDef {
  id: string;
  x: number;
  y: number;
}

export interface AcornRuntime extends AcornDef {
  collected: boolean;
  bobOffset: number;
}

export interface EnemyDef {
  id: string;
  kind: 'beetle' | 'slime';
  x: number;
  y: number;
  patrolMinX: number;
  patrolMaxX: number;
  speed: number;
}

export interface EnemyRuntime extends EnemyDef {
  width: number;
  height: number;
  vx: number;
  alive: boolean;
  squashTimer: number;
  animPhase: number;
}

export interface CastleDef {
  x: number;
  y: number;
  width: number;
  height: number;
  bannerColor?: string;
}

export interface LevelDef {
  id: number;
  name: string;
  subtitle: string;
  worldWidth: number;
  spawnX: number;
  spawnY: number;
  platforms: PlatformDef[];
  acorns: AcornDef[];
  enemies: EnemyDef[];
  castle: CastleDef;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface Firefly {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speedX: number;
  speedY: number;
  alpha: number;
}

export interface PlayerState {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  coyoteTimer: number;
  jumpBufferTimer: number;
  anim: AnimationState;
  animTime: number;
  scarfWave: number;
  slashTimer: number;
  invulnTimer: number;
  squashX: number;
  squashY: number;
  hp: number;
  maxHp: number;
}

export interface HudSnapshot {
  acornsCollected: number;
  totalAcorns: number;
  hp: number;
  maxHp: number;
  elapsedSeconds: number;
  enemiesDefeated: number;
  levelIndex: number;
  levelName: string;
}
