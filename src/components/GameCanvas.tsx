import React, { useEffect, useRef } from 'react';
import { soundEngine } from '../game/audio';
import { LEVELS } from '../game/levels';
import {
  drawAcorn,
  drawBramble,
  drawCastle,
  drawEnemy,
  drawForegroundCanopy,
  drawForestBackground,
  drawParticles,
  drawPlatform,
  LOGICAL_HEIGHT,
} from '../game/renderer';
import {
  AcornRuntime,
  EnemyRuntime,
  Firefly,
  GameState,
  HudSnapshot,
  InputState,
  LevelDef,
  Particle,
  PlatformRuntime,
  PlayerState,
} from '../game/types';

interface GameCanvasProps {
  gameState: GameState;
  levelIndex: number;
  runNonce: number;
  touchInputRef: React.MutableRefObject<{
    left: boolean;
    right: boolean;
    jumpHeld: boolean;
    jumpQueued: boolean;
    attackQueued: boolean;
  }>;
  onHudUpdate: (hud: HudSnapshot) => void;
  onStageClear: (summary: HudSnapshot) => void;
  onGameOver: (summary: HudSnapshot) => void;
  onPauseToggle: () => void;
  onVisualControlState: (state: { left: boolean; right: boolean; jump: boolean }) => void;
}

const FIXED_DT = 1 / 60;
const GRAVITY = 1480;
const JUMP_VELOCITY = -575;
const MOVE_ACCEL = 1950;
const AIR_ACCEL = 1450;
const GROUND_FRICTION = 2100;
const AIR_FRICTION = 750;
const MAX_SPEED = 248;
const COYOTE_TIME = 0.11;
const JUMP_BUFFER_TIME = 0.12;

function createFireflies(): Firefly[] {
  const list: Firefly[] = [];
  for (let i = 0; i < 28; i++) {
    list.push({
      x: (i * 97) % 1200,
      y: 70 + ((i * 61) % 390),
      radius: 1.5 + (i % 3) * 0.75,
      phase: i * 0.85,
      speedX: 6 + (i % 5) * 3,
      speedY: 0,
      alpha: 0.35 + (i % 4) * 0.15,
    });
  }
  return list;
}

function initLevelState(level: LevelDef): {
  player: PlayerState;
  platforms: PlatformRuntime[];
  acorns: AcornRuntime[];
  enemies: EnemyRuntime[];
} {
  const player: PlayerState = {
    x: level.spawnX,
    y: level.spawnY,
    width: 32,
    height: 44,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: false,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    anim: 'idle',
    animTime: 0,
    scarfWave: 0,
    slashTimer: 0,
    invulnTimer: 0,
    squashX: 1,
    squashY: 1,
    hp: 3,
    maxHp: 3,
  };

  const platforms: PlatformRuntime[] = level.platforms.map((p, idx) => ({
    ...p,
    originX: p.x,
    originY: p.y,
    dx: 0,
    dy: 0,
    phase: idx * 0.9,
  }));

  const acorns: AcornRuntime[] = level.acorns.map((a, idx) => ({
    ...a,
    collected: false,
    bobOffset: idx * 0.7,
  }));

  const enemies: EnemyRuntime[] = level.enemies.map((e, idx) => ({
    ...e,
    width: 32,
    height: 24,
    vx: e.speed * (idx % 2 === 0 ? 1 : -1),
    alive: true,
    squashTimer: 0,
    animPhase: idx * 1.1,
  }));

  return { player, platforms, acorns, enemies };
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  levelIndex,
  runNonce,
  touchInputRef,
  onHudUpdate,
  onStageClear,
  onGameOver,
  onPauseToggle,
  onVisualControlState,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameStateRef = useRef<GameState>(gameState);
  gameStateRef.current = gameState;

  const callbacksRef = useRef({
    onHudUpdate,
    onStageClear,
    onGameOver,
    onPauseToggle,
    onVisualControlState,
  });
  callbacksRef.current = {
    onHudUpdate,
    onStageClear,
    onGameOver,
    onPauseToggle,
    onVisualControlState,
  };

  const keysRef = useRef({
    left: false,
    right: false,
    jumpHeld: false,
    jumpQueued: false,
    attackQueued: false,
  });

  // World runtime ref reset whenever levelIndex or runNonce changes
  const worldRef = useRef<{
    level: LevelDef;
    player: PlayerState;
    platforms: PlatformRuntime[];
    acorns: AcornRuntime[];
    enemies: EnemyRuntime[];
    particles: Particle[];
    fireflies: Firefly[];
    cameraX: number;
    elapsedSeconds: number;
    acornsCollected: number;
    enemiesDefeated: number;
    doorOpenProgress: number;
    goalTriggered: boolean;
    goalTimer: number;
    time: number;
  } | null>(null);

  // Initialize or reset level
  useEffect(() => {
    const level = LEVELS[levelIndex] ?? LEVELS[0];
    const initialized = initLevelState(level);
    worldRef.current = {
      level,
      ...initialized,
      particles: [],
      fireflies: createFireflies(),
      cameraX: 0,
      elapsedSeconds: 0,
      acornsCollected: 0,
      enemiesDefeated: 0,
      doorOpenProgress: 0,
      goalTriggered: false,
      goalTimer: 0,
      time: 0,
    };

    callbacksRef.current.onHudUpdate({
      acornsCollected: 0,
      totalAcorns: initialized.acorns.length,
      hp: initialized.player.hp,
      maxHp: initialized.player.maxHp,
      elapsedSeconds: 0,
      enemiesDefeated: 0,
      levelIndex,
      levelName: level.name,
    });
  }, [levelIndex, runNonce]);

  // Keyboard bindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = true;
      } else if (
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW'
      ) {
        if (gameStateRef.current === 'PLAYING') {
          e.preventDefault();
        }
        if (!keysRef.current.jumpHeld) {
          keysRef.current.jumpQueued = true;
        }
        keysRef.current.jumpHeld = true;
      } else if (e.code === 'KeyF' || e.code === 'KeyJ' || e.code === 'KeyE' || e.code === 'ShiftLeft') {
        if (!e.repeat) {
          keysRef.current.attackQueued = true;
        }
      } else if (e.code === 'Escape' || e.code === 'KeyP') {
        if (
          !e.repeat &&
          (gameStateRef.current === 'PLAYING' || gameStateRef.current === 'PAUSED')
        ) {
          callbacksRef.current.onPauseToggle();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysRef.current.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysRef.current.right = false;
      } else if (
        e.code === 'Space' ||
        e.code === 'ArrowUp' ||
        e.code === 'KeyW'
      ) {
        keysRef.current.jumpHeld = false;
      }
    };

    const handleBlur = () => {
      keysRef.current.left = false;
      keysRef.current.right = false;
      keysRef.current.jumpHeld = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Main Animation & Fixed-Timestep Physics Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let lastTimestamp = performance.now();
    let accumulator = 0;
    let lastHudEmit = 0;
    let lastVisualLeft = false;
    let lastVisualRight = false;
    let lastVisualJump = false;

    const spawnBurst = (
      x: number,
      y: number,
      count: number,
      colors: string[],
      speed = 110,
      gravity = 220
    ) => {
      const w = worldRef.current;
      if (!w) return;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const mag = speed * (0.45 + Math.random() * 0.7);
        w.particles.push({
          x,
          y,
          vx: Math.cos(angle) * mag,
          vy: Math.sin(angle) * mag - 45,
          size: 2.2 + Math.random() * 2.5,
          color: colors[i % colors.length],
          alpha: 0.95,
          life: 0.38 + Math.random() * 0.25,
          maxLife: 0.63,
          gravity,
        });
      }
    };

    const buildHudSnapshot = (): HudSnapshot => {
      const w = worldRef.current!;
      return {
        acornsCollected: w.acornsCollected,
        totalAcorns: w.acorns.length,
        hp: w.player.hp,
        maxHp: w.player.maxHp,
        elapsedSeconds: w.elapsedSeconds,
        enemiesDefeated: w.enemiesDefeated,
        levelIndex,
        levelName: w.level.name,
      };
    };

    const stepPhysics = (dt: number) => {
      const w = worldRef.current;
      if (!w) return;
      const state = gameStateRef.current;

      w.time += dt;

      // Drift fireflies gently even on title menu
      for (const f of w.fireflies) {
        f.x += f.speedX * dt;
      }

      // Update particles
      for (let i = w.particles.length - 1; i >= 0; i--) {
        const pt = w.particles[i];
        pt.vy += pt.gravity * dt;
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        if (pt.life <= 0) {
          w.particles.splice(i, 1);
        }
      }

      if (state === 'TITLE_MENU') {
        w.player.anim = 'idle';
        w.player.scarfWave += dt * 4.5;
        w.player.animTime += dt;
        return;
      }

      if (state !== 'PLAYING') {
        return;
      }

      const input: InputState = {
        left: keysRef.current.left || touchInputRef.current.left,
        right: keysRef.current.right || touchInputRef.current.right,
        jumpHeld: keysRef.current.jumpHeld || touchInputRef.current.jumpHeld,
        jumpPressedThisFrame:
          keysRef.current.jumpQueued || touchInputRef.current.jumpQueued,
        attackPressedThisFrame:
          keysRef.current.attackQueued || touchInputRef.current.attackQueued,
      };
      keysRef.current.jumpQueued = false;
      touchInputRef.current.jumpQueued = false;
      keysRef.current.attackQueued = false;
      touchInputRef.current.attackQueued = false;

      if (
        input.left !== lastVisualLeft ||
        input.right !== lastVisualRight ||
        input.jumpHeld !== lastVisualJump
      ) {
        lastVisualLeft = input.left;
        lastVisualRight = input.right;
        lastVisualJump = input.jumpHeld;
        callbacksRef.current.onVisualControlState({
          left: input.left,
          right: input.right,
          jump: input.jumpHeld,
        });
      }

      const { player, platforms, acorns, enemies, level } = w;

      // Update moving platforms first
      for (const p of platforms) {
        const prevX = p.x;
        const prevY = p.y;
        if (p.moveX) {
          p.x = p.originX + Math.sin(w.time * (p.moveSpeed ?? 1.2) + p.phase) * p.moveX;
        }
        if (p.moveY) {
          p.y = p.originY + Math.sin(w.time * (p.moveSpeed ?? 1.2) + p.phase) * p.moveY;
        }
        p.dx = p.x - prevX;
        p.dy = p.y - prevY;
      }

      // If goal already triggered, play castle door opening sequence
      if (w.goalTriggered) {
        w.goalTimer += dt;
        w.doorOpenProgress = Math.min(1, w.goalTimer / 0.55);
        player.anim = 'victory';
        player.vx *= 0.85;
        player.vy = 0;
        player.scarfWave += dt * 7;
        player.squashX += (1 - player.squashX) * 12 * dt;
        player.squashY += (1 - player.squashY) * 12 * dt;

        if (w.goalTimer >= 0.75) {
          callbacksRef.current.onStageClear(buildHudSnapshot());
        }
        return;
      }

      w.elapsedSeconds += dt;

      // Timers
      if (player.invulnTimer > 0) player.invulnTimer = Math.max(0, player.invulnTimer - dt);
      if (player.slashTimer > 0) player.slashTimer = Math.max(0, player.slashTimer - dt);

      if (input.attackPressedThisFrame && player.slashTimer <= 0) {
        player.slashTimer = 0.22;
        soundEngine.playSlash();
      }

      // Horizontal acceleration & friction
      const moveDir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      if (moveDir !== 0) {
        player.facing = moveDir > 0 ? 1 : -1;
        const accel = player.onGround ? MOVE_ACCEL : AIR_ACCEL;
        player.vx += moveDir * accel * dt;
        if (Math.abs(player.vx) > MAX_SPEED) {
          player.vx = Math.sign(player.vx) * MAX_SPEED;
        }
      } else {
        const decel = (player.onGround ? GROUND_FRICTION : AIR_FRICTION) * dt;
        if (Math.abs(player.vx) <= decel) {
          player.vx = 0;
        } else {
          player.vx -= Math.sign(player.vx) * decel;
        }
      }

      // Coyote time & jump buffer
      if (player.onGround) {
        player.coyoteTimer = COYOTE_TIME;
      } else {
        player.coyoteTimer = Math.max(0, player.coyoteTimer - dt);
      }

      if (input.jumpPressedThisFrame) {
        player.jumpBufferTimer = JUMP_BUFFER_TIME;
      } else {
        player.jumpBufferTimer = Math.max(0, player.jumpBufferTimer - dt);
      }

      // Trigger jump
      if (player.jumpBufferTimer > 0 && player.coyoteTimer > 0) {
        player.vy = JUMP_VELOCITY;
        player.onGround = false;
        player.coyoteTimer = 0;
        player.jumpBufferTimer = 0;
        player.squashX = 0.82;
        player.squashY = 1.2;
        soundEngine.playJump();
        spawnBurst(
          player.x + player.width / 2,
          player.y + player.height,
          6,
          ['#8CC462', '#D9F99D', '#75AE4E'],
          70,
          180
        );
      }

      // Variable jump height (short hop when released early)
      if (!input.jumpHeld && player.vy < -180) {
        player.vy += GRAVITY * 1.45 * dt;
      }

      // Gravity
      player.vy = Math.min(820, player.vy + GRAVITY * dt);

      // Move X & resolve horizontal collisions
      player.x += player.vx * dt;
      if (player.x < 0) {
        player.x = 0;
        player.vx = 0;
      }
      if (player.x + player.width > level.worldWidth) {
        player.x = level.worldWidth - player.width;
        player.vx = 0;
      }

      for (const p of platforms) {
        if (
          player.x < p.x + p.width &&
          player.x + player.width > p.x &&
          player.y + 4 < p.y + p.height &&
          player.y + player.height - 4 > p.y
        ) {
          if (player.vx > 0) {
            player.x = p.x - player.width;
            player.vx = 0;
          } else if (player.vx < 0) {
            player.x = p.x + p.width;
            player.vx = 0;
          }
        }
      }

      // Move Y & resolve vertical collisions
      const wasOnGround = player.onGround;
      const prevBottom = player.y + player.height;
      player.y += player.vy * dt;
      player.onGround = false;
      let stoodPlatform: PlatformRuntime | null = null;

      for (const p of platforms) {
        const horizOverlap =
          player.x + 4 < p.x + p.width && player.x + player.width - 4 > p.x;
        if (!horizOverlap) continue;

        // Landing on top of platform
        if (
          player.vy >= 0 &&
          prevBottom <= p.y + 10 + Math.max(0, p.dy) &&
          player.y + player.height >= p.y
        ) {
          player.y = p.y - player.height;
          if (!wasOnGround && player.vy > 220) {
            player.squashX = 1.22;
            player.squashY = 0.8;
            soundEngine.playLand();
            spawnBurst(
              player.x + player.width / 2,
              player.y + player.height,
              5,
              ['#75AE4E', '#A3E635', '#674D3A'],
              65,
              210
            );
          }
          player.vy = 0;
          player.onGround = true;
          stoodPlatform = p;
        } else if (
          player.vy < 0 &&
          player.y <= p.y + p.height &&
          player.y + player.height > p.y + p.height
        ) {
          // Head bump from underneath
          player.y = p.y + p.height;
          player.vy = 20;
        }
      }

      // Carry player with moving platform
      if (stoodPlatform) {
        player.x += stoodPlatform.dx;
      }

      // Squash/stretch spring recovery
      player.squashX += (1 - player.squashX) * 14 * dt;
      player.squashY += (1 - player.squashY) * 14 * dt;

      // Update animation state
      if (!player.onGround) {
        player.anim = player.vy < 0 ? 'jump' : 'fall';
      } else if (Math.abs(player.vx) > 22) {
        player.anim = 'run';
      } else {
        player.anim = 'idle';
      }

      player.animTime += dt * (player.anim === 'run' ? Math.max(0.6, Math.abs(player.vx) / MAX_SPEED) : 1);
      player.scarfWave += dt * (player.anim === 'run' ? 14 : 5.5);

      // Collect Golden Acorns
      const pCx = player.x + player.width / 2;
      const pCy = player.y + player.height / 2;
      for (const acorn of acorns) {
        if (acorn.collected) continue;
        const dist = Math.hypot(pCx - acorn.x, pCy - acorn.y);
        if (dist < 31) {
          acorn.collected = true;
          w.acornsCollected += 1;
          soundEngine.playAcorn(w.acornsCollected - 1);
          spawnBurst(
            acorn.x,
            acorn.y,
            10,
            ['#FDE047', '#F59E0B', '#FEF9C3'],
            135,
            140
          );
        }
      }

      // Update & collide with Enemies
      for (const enemy of enemies) {
        if (!enemy.alive) {
          enemy.squashTimer = Math.max(0, enemy.squashTimer - dt);
          continue;
        }

        enemy.x += enemy.vx * dt;
        if (enemy.x <= enemy.patrolMinX) {
          enemy.x = enemy.patrolMinX;
          enemy.vx = Math.abs(enemy.vx);
        } else if (enemy.x + enemy.width >= enemy.patrolMaxX) {
          enemy.x = enemy.patrolMaxX - enemy.width;
          enemy.vx = -Math.abs(enemy.vx);
        }

        const eLeft = enemy.x + 2;
        const eRight = enemy.x + enemy.width - 2;
        const eTop = enemy.y - enemy.height;
        const eBottom = enemy.y;

        // Check twig sword slash hit
        if (player.slashTimer > 0.06) {
          const swordLeft =
            player.facing === 1 ? player.x + player.width * 0.5 : player.x - 32;
          const swordRight =
            player.facing === 1 ? player.x + player.width + 32 : player.x + player.width * 0.5;
          if (
            swordRight > eLeft &&
            swordLeft < eRight &&
            player.y + player.height > eTop &&
            player.y < eBottom
          ) {
            enemy.alive = false;
            enemy.squashTimer = 0.35;
            w.enemiesDefeated += 1;
            soundEngine.playStomp();
            spawnBurst(
              enemy.x + enemy.width / 2,
              enemy.y - 12,
              10,
              ['#84CC16', '#FDE047', '#D97757'],
              140,
              220
            );
            continue;
          }
        }

        // Player-enemy body overlap
        if (
          player.x + player.width - 4 > eLeft &&
          player.x + 4 < eRight &&
          player.y + player.height > eTop &&
          player.y + 4 < eBottom
        ) {
          // Stomp from above
          const isStomping =
            player.vy > 0 && player.y + player.height - player.vy * dt <= eTop + 14;
          if (isStomping) {
            enemy.alive = false;
            enemy.squashTimer = 0.35;
            w.enemiesDefeated += 1;
            player.vy = -410;
            player.squashX = 1.18;
            player.squashY = 0.84;
            soundEngine.playStomp();
            spawnBurst(
              enemy.x + enemy.width / 2,
              enemy.y - 10,
              9,
              ['#A3E635', '#FDE047', '#65A30D'],
              130,
              210
            );
          } else if (player.invulnTimer <= 0) {
            player.hp -= 1;
            player.invulnTimer = 1.25;
            player.vy = -340;
            player.vx = (pCx < enemy.x + enemy.width / 2 ? -1 : 1) * 220;
            soundEngine.playHurt();
            spawnBurst(pCx, pCy, 8, ['#EF4444', '#FCA5A5', '#FEF08A'], 125, 240);

            if (player.hp <= 0) {
              callbacksRef.current.onGameOver(buildHudSnapshot());
              return;
            }
          }
        }
      }

      // Fall into forest ravine -> lose 1 HP & respawn safely on first/nearest safe ledge or Game Over
      if (player.y > LOGICAL_HEIGHT + 90) {
        player.hp -= 1;
        soundEngine.playHurt();
        if (player.hp <= 0) {
          callbacksRef.current.onGameOver(buildHudSnapshot());
          return;
        }
        // Find nearest platform behind or at spawn
        let safePlatform = platforms[0];
        for (const p of platforms) {
          if (p.x <= player.x && p.x >= safePlatform.x && !p.moveX && !p.moveY) {
            safePlatform = p;
          }
        }
        player.x = safePlatform.x + Math.min(48, safePlatform.width * 0.25);
        player.y = safePlatform.y - player.height - 6;
        player.vx = 0;
        player.vy = 0;
        player.invulnTimer = 1.3;
      }

      // Check Castle Gatehouse Door Goal!
      const doorCenterX = level.castle.x + level.castle.width * 0.56;
      const doorBottomY = level.castle.y + level.castle.height;
      if (
        Math.abs(pCx - doorCenterX) < 42 &&
        Math.abs(player.y + player.height - doorBottomY) < 44
      ) {
        w.goalTriggered = true;
        w.goalTimer = 0;
        soundEngine.playVictory();
        spawnBurst(
          doorCenterX,
          doorBottomY - 56,
          22,
          ['#FDE047', '#F59E0B', '#86EFAC', '#FDA4AF'],
          185,
          120
        );
      }

      // Emit throttled HUD state
      if (w.time - lastHudEmit > 0.08) {
        lastHudEmit = w.time;
        callbacksRef.current.onHudUpdate(buildHudSnapshot());
      }
    };

    const renderFrame = () => {
      const w = worldRef.current;
      if (!w) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = canvas.clientWidth;
      const cssH = canvas.clientHeight;
      if (cssW === 0 || cssH === 0) return;

      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const scale = cssH / LOGICAL_HEIGHT;
      const logicalViewW = cssW / scale;

      // Smooth camera tracking with gentle lookahead
      const targetCamX = Math.max(
        0,
        Math.min(
          w.level.worldWidth - logicalViewW,
          w.player.x + w.player.width / 2 - logicalViewW * 0.38
        )
      );
      w.cameraX += (targetCamX - w.cameraX) * 0.12;

      ctx.save();
      ctx.scale(dpr * scale, dpr * scale);

      // 1. Background layers
      drawForestBackground(
        ctx,
        logicalViewW,
        LOGICAL_HEIGHT,
        w.cameraX,
        w.time,
        w.fireflies
      );

      // 2. World-space objects
      ctx.save();
      ctx.translate(-w.cameraX, 0);

      // Castle Gatehouse sits behind the final platform lip slightly or right on top of ground
      drawCastle(ctx, w.level.castle, w.doorOpenProgress, w.time);

      // Platforms
      for (const p of w.platforms) {
        if (p.x + p.width < w.cameraX - 60 || p.x > w.cameraX + logicalViewW + 60) {
          continue;
        }
        drawPlatform(ctx, p);
      }

      // Floating Golden Acorns
      for (const acorn of w.acorns) {
        drawAcorn(ctx, acorn, w.time);
      }

      // Forest Critters
      for (const enemy of w.enemies) {
        drawEnemy(ctx, enemy, w.time);
      }

      // Bramble the Hedgehog Knight
      drawBramble(ctx, w.player, w.time);

      // Particles
      drawParticles(ctx, w.particles);

      ctx.restore();

      // 3. Subtle bottom leafy canopy framing
      drawForegroundCanopy(ctx, logicalViewW, LOGICAL_HEIGHT, w.cameraX);

      ctx.restore();
    };

    const tick = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTimestamp) / 1000);
      lastTimestamp = now;
      accumulator += rawDt;

      while (accumulator >= FIXED_DT) {
        stepPhysics(FIXED_DT);
        accumulator -= FIXED_DT;
      }

      renderFrame();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [levelIndex, runNonce, touchInputRef]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full"
      aria-label="Màn hình trò chơi Bramble: Hiệp Sĩ Nhím"
    />
  );
};
