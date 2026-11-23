import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Pause,
  Play,
  RotateCcw,
  Sword,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameCanvas } from './components/GameCanvas';
import { soundEngine } from './game/audio';
import { LEVELS } from './game/levels';
import { GameState, HudSnapshot } from './game/types';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [levelIndex, setLevelIndex] = useState(0);
  const [runNonce, setRunNonce] = useState(0);
  const [muted, setMuted] = useState(false);

  const [hud, setHud] = useState<HudSnapshot>({
    acornsCollected: 0,
    totalAcorns: LEVELS[0].acorns.length,
    hp: 3,
    maxHp: 3,
    elapsedSeconds: 0,
    enemiesDefeated: 0,
    levelIndex: 0,
    levelName: LEVELS[0].name,
  });

  const [visualControls, setVisualControls] = useState({
    left: false,
    right: false,
    jump: false,
  });

  const [totalStats, setTotalStats] = useState({
    acorns: 0,
    time: 0,
    enemies: 0,
  });

  const touchInputRef = useRef({
    left: false,
    right: false,
    jumpHeld: false,
    jumpQueued: false,
    attackQueued: false,
  });

  const startGame = useCallback((startLevel = 0) => {
    setLevelIndex(startLevel);
    if (startLevel === 0) {
      setTotalStats({ acorns: 0, time: 0, enemies: 0 });
    }
    setRunNonce((n) => n + 1);
    setGameState('PLAYING');
  }, []);

  const restartCurrentLevel = useCallback(() => {
    touchInputRef.current = {
      left: false,
      right: false,
      jumpHeld: false,
      jumpQueued: false,
      attackQueued: false,
    };
    setRunNonce((n) => n + 1);
    setGameState('PLAYING');
  }, []);

  const handleStageClear = useCallback(
    (summary: HudSnapshot) => {
      setHud(summary);
      setTotalStats((prev) => ({
        acorns: prev.acorns + summary.acornsCollected,
        time: prev.time + summary.elapsedSeconds,
        enemies: prev.enemies + summary.enemiesDefeated,
      }));
      if (levelIndex + 1 >= LEVELS.length) {
        setGameState('VICTORY');
      } else {
        setGameState('STAGE_CLEAR');
      }
    },
    [levelIndex]
  );

  const handleGameOver = useCallback((summary: HudSnapshot) => {
    setHud(summary);
    setGameState('GAME_OVER');
  }, []);

  const handlePauseToggle = useCallback(() => {
    setGameState((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const nextLevel = useCallback(() => {
    const nextIdx = Math.min(LEVELS.length - 1, levelIndex + 1);
    setLevelIndex(nextIdx);
    setRunNonce((n) => n + 1);
    setGameState('PLAYING');
  }, [levelIndex]);

  // Allow Enter key on menu/summary modals for brisk keyboard play
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Enter') {
        if (gameState === 'TITLE_MENU') {
          startGame(0);
        } else if (gameState === 'STAGE_CLEAR') {
          nextLevel();
        } else if (gameState === 'GAME_OVER') {
          restartCurrentLevel();
        } else if (gameState === 'VICTORY') {
          startGame(0);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, nextLevel, restartCurrentLevel, startGame]);

  const currentLevel = LEVELS[levelIndex] ?? LEVELS[0];

  return (
    <div className="min-h-screen w-full bg-[#111D16] text-[#F4F1E8] flex flex-col">
      {/* Compact, Unobtrusive Top HUD Bar (3-Zone Contract) */}
      <header className="w-full max-w-[1280px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6 border-b border-white/10 shrink-0">
        {/* Zone 1: Wordmark */}
        <button
          type="button"
          onClick={() => setGameState('TITLE_MENU')}
          className="font-[var(--font-display)] text-lg sm:text-xl font-bold tracking-tight text-[#F4F1E8] hover:text-[#E7C25D] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E7C25D]"
        >
          Bramble
        </button>

        {/* Zone 2: Clean Unboxed Game Telemetry */}
        <div className="flex items-center gap-3 sm:gap-5 text-xs sm:text-sm text-[#C8D3C2] overflow-hidden">
          <span className="hidden md:inline font-medium text-[#F4F1E8] whitespace-nowrap truncate">
            Stage {levelIndex + 1} of {LEVELS.length} · {currentLevel.name}
          </span>

          <span className="hidden md:inline text-white/25" aria-hidden="true">
            /
          </span>

          <div className="flex items-center gap-1.5 whitespace-nowrap shrink-0" aria-label={`Health ${hud.hp} of ${hud.maxHp}`}>
            {Array.from({ length: hud.maxHp }).map((_, i) => (
              <Heart
                key={i}
                className={`w-4 h-4 transition-transform duration-150 ${
                  i < hud.hp
                    ? 'fill-[#D94A56] text-[#D94A56]'
                    : 'fill-transparent text-white/25'
                }`}
              />
            ))}
            <span className="ml-1 font-mono tabular-nums text-xs text-[#C8D3C2]">
              HP {hud.hp}/{hud.maxHp}
            </span>
          </div>

          <span className="text-white/25" aria-hidden="true">
            ·
          </span>

          <span className="font-mono tabular-nums whitespace-nowrap shrink-0 text-[#F4D371]">
            Acorns {hud.acornsCollected}/{hud.totalAcorns}
          </span>

          <span className="hidden sm:inline text-white/25" aria-hidden="true">
            ·
          </span>

          <span className="hidden sm:inline font-mono tabular-nums whitespace-nowrap shrink-0">
            {formatTime(hud.elapsedSeconds)}
          </span>
        </div>

        {/* Zone 3: Functional Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sound effects' : 'Mute sound effects'}
            className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/12 text-[#E2E8DC] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E7C25D]"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {gameState === 'PLAYING' || gameState === 'PAUSED' ? (
            <>
              <button
                type="button"
                onClick={restartCurrentLevel}
                aria-label="Restart level"
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/12 text-[#E2E8DC] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E7C25D]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handlePauseToggle}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#D4A442] hover:bg-[#E2B452] text-[#1D1609] transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
              >
                {gameState === 'PAUSED' ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Resume</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => startGame(0)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#D4A442] hover:bg-[#E2B452] text-[#1D1609] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
            >
              Start Game
            </button>
          )}
        </div>
      </header>

      {/* Main Game Stage Viewport */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-2 sm:px-6 py-3 sm:py-5 flex flex-col justify-center">
        <div className="relative w-full aspect-[16/9] min-h-[380px] max-h-[calc(100vh-110px)] rounded-xl overflow-hidden bg-[#1D3225] border border-white/12 shadow-2xl">
          <GameCanvas
            gameState={gameState}
            levelIndex={levelIndex}
            runNonce={runNonce}
            touchInputRef={touchInputRef}
            onHudUpdate={setHud}
            onStageClear={handleStageClear}
            onGameOver={handleGameOver}
            onPauseToggle={handlePauseToggle}
            onVisualControlState={setVisualControls}
          />

          {/* In-Game On-Screen Controls Matching the Screenshots */}
          {gameState === 'PLAYING' && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3 sm:p-5 flex items-end justify-between gap-3">
              {/* Left / Right Arrow Pads */}
              <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  aria-label="Move Left"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    touchInputRef.current.left = true;
                    setVisualControls((v) => ({ ...v, left: true }));
                  }}
                  onPointerUp={() => {
                    touchInputRef.current.left = false;
                    setVisualControls((v) => ({ ...v, left: false }));
                  }}
                  onPointerCancel={() => {
                    touchInputRef.current.left = false;
                    setVisualControls((v) => ({ ...v, left: false }));
                  }}
                  className={`touch-control w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border backdrop-blur-sm flex items-center justify-center transition-transform duration-100 cursor-pointer ${
                    visualControls.left
                      ? 'bg-[#2B4A37]/95 border-[#A6C98B]/60 scale-95 text-white'
                      : 'bg-[#172A1E]/72 border-white/20 text-white/90 hover:bg-[#1E3627]/85'
                  }`}
                >
                  <ChevronLeft className="w-7 h-7" />
                </button>

                <button
                  type="button"
                  aria-label="Move Right"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    touchInputRef.current.right = true;
                    setVisualControls((v) => ({ ...v, right: true }));
                  }}
                  onPointerUp={() => {
                    touchInputRef.current.right = false;
                    setVisualControls((v) => ({ ...v, right: false }));
                  }}
                  onPointerCancel={() => {
                    touchInputRef.current.right = false;
                    setVisualControls((v) => ({ ...v, right: false }));
                  }}
                  className={`touch-control w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border backdrop-blur-sm flex items-center justify-center transition-transform duration-100 cursor-pointer ${
                    visualControls.right
                      ? 'bg-[#2B4A37]/95 border-[#A6C98B]/60 scale-95 text-white'
                      : 'bg-[#172A1E]/72 border-white/20 text-white/90 hover:bg-[#1E3627]/85'
                  }`}
                >
                  <ChevronRight className="w-7 h-7" />
                </button>
              </div>

              {/* Center Instruction Hint (matching screenshot caption) */}
              <p className="hidden sm:block mb-2 text-xs sm:text-sm font-medium text-[#F4F1E8]/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.75)] select-none text-center">
                Hold an arrow to move · Tap JUMP to leap
              </p>

              {/* Right Action Buttons: Twig Slash + JUMP */}
              <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  aria-label="Twig Sword Slash"
                  title="Twig Slash (F)"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    touchInputRef.current.attackQueued = true;
                  }}
                  className="touch-control w-14 h-14 sm:w-15 sm:h-15 rounded-2xl border border-white/20 bg-[#172A1E]/72 hover:bg-[#233E2D]/85 active:scale-95 text-[#E8E2D0] backdrop-blur-sm flex items-center justify-center transition-transform duration-100 cursor-pointer"
                >
                  <Sword className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  aria-label="Jump"
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    touchInputRef.current.jumpQueued = true;
                    touchInputRef.current.jumpHeld = true;
                    setVisualControls((v) => ({ ...v, jump: true }));
                  }}
                  onPointerUp={() => {
                    touchInputRef.current.jumpHeld = false;
                    setVisualControls((v) => ({ ...v, jump: false }));
                  }}
                  onPointerCancel={() => {
                    touchInputRef.current.jumpHeld = false;
                    setVisualControls((v) => ({ ...v, jump: false }));
                  }}
                  className={`touch-control h-14 sm:h-16 px-6 sm:px-8 rounded-2xl border font-[var(--font-display)] font-bold tracking-wide text-base sm:text-lg transition-transform duration-100 cursor-pointer shadow-lg ${
                    visualControls.jump
                      ? 'bg-[#C4922F] border-[#FDE68A] text-[#1D1508] scale-95'
                      : 'bg-[#D6A645]/95 hover:bg-[#E2B555] border-[#F3CF7A]/60 text-[#22190A]'
                  }`}
                >
                  JUMP
                </button>
              </div>
            </div>
          )}

          {/* TITLE MENU OVERLAY */}
          {gameState === 'TITLE_MENU' && (
            <div className="absolute inset-0 bg-gradient-to-t from-[#101C14]/88 via-[#14241A]/68 to-[#14241A]/45 backdrop-blur-[2px] flex items-center justify-center p-4 sm:p-8">
              <div className="w-full max-w-lg bg-[#16271C]/92 border border-white/15 rounded-2xl p-6 sm:p-8 shadow-2xl text-center">
                {/* Bramble Emblem SVG */}
                <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-[#22392A] border border-white/10 flex items-center justify-center shadow-inner">
                  <svg viewBox="0 0 80 80" className="w-16 h-16" aria-hidden="true">
                    {/* Scarf tail */}
                    <path d="M24 46 Q10 47 7 53 L12 58 Q20 53 27 51 Z" fill="#C93848" stroke="#5B1A22" strokeWidth="1.5" />
                    {/* Quills */}
                    <path d="M31 28 L20 33 L26 39 L17 44 L25 49 L21 55 L34 55 Z" fill="#4E6345" stroke="#222D1E" strokeWidth="1.5" />
                    {/* Body & Snout */}
                    <ellipse cx="42" cy="46" rx="14" ry="13" fill="#C9D5B5" stroke="#222D1E" strokeWidth="1.8" />
                    <ellipse cx="52" cy="39" rx="10" ry="8" fill="#D7E2C6" stroke="#222D1E" strokeWidth="1.6" />
                    <circle cx="61" cy="39" r="2.5" fill="#1E1B18" />
                    <circle cx="52" cy="36" r="2.4" fill="#1E1B18" />
                    <circle cx="52.8" cy="35.3" r="0.9" fill="#FFF" />
                    {/* Scarf collar */}
                    <rect x="30" y="43" width="24" height="7" rx="3.5" fill="#D64252" stroke="#5B1A22" strokeWidth="1.5" />
                    {/* Acorn helmet */}
                    <g transform="translate(42,27) rotate(-8)">
                      <ellipse cx="0" cy="0" rx="16" ry="11" fill="#9D5324" stroke="#3B1E0C" strokeWidth="1.8" />
                      <rect x="-2.5" y="-15" width="5" height="6" rx="2" fill="#6E3714" stroke="#3B1E0C" strokeWidth="1.4" />
                    </g>
                    {/* Twig sword */}
                    <line x1="48" y1="50" x2="66" y2="33" stroke="#5C3A21" strokeWidth="3.2" strokeLinecap="round" />
                    <ellipse cx="66" cy="31" rx="5" ry="2.5" transform="rotate(-32 66 31)" fill="#73A942" stroke="#2A4719" strokeWidth="1.2" />
                    {/* Boots */}
                    <rect x="33" y="57" width="10" height="7" rx="3" fill="#6D3F2A" stroke="#2B1B12" strokeWidth="1.5" />
                    <rect x="44" y="57" width="10" height="7" rx="3" fill="#7E4B33" stroke="#2B1B12" strokeWidth="1.5" />
                  </svg>
                </div>

                <h1 className="font-[var(--font-display)] text-3xl sm:text-4xl font-bold tracking-tight text-[#F4F1E8] text-balance">
                  Bramble: Hedgehog Knight
                </h1>
                <p className="mt-2.5 text-sm sm:text-base text-[#C4D1BF] max-w-md mx-auto leading-relaxed">
                  Leap across misty forest ledges, gather glowing golden acorns, stomp thorny beetles, and reach the woodland castle.
                </p>

                {/* Stage Select Strip */}
                <div className="mt-5 flex items-center justify-center gap-1.5 p-1 bg-black/25 rounded-xl border border-white/10">
                  {LEVELS.map((lvl, idx) => (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setLevelIndex(idx)}
                      className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        levelIndex === idx
                          ? 'bg-[#D4A442] text-[#1D1609]'
                          : 'text-[#C4D1BF] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {idx + 1}. {lvl.name}
                    </button>
                  ))}
                </div>

                <div className="mt-5 text-xs text-[#A4B59E] flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
                  <span>Move: A / D or Arrow Keys</span>
                  <span aria-hidden="true">·</span>
                  <span>Jump: Space / W / Up</span>
                  <span aria-hidden="true">·</span>
                  <span>Twig Slash: F / E</span>
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => startGame(levelIndex)}
                    className="px-8 py-3 rounded-xl bg-[#D4A442] hover:bg-[#E2B452] text-[#1D1609] font-bold text-base transition-colors shadow-lg whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
                  >
                    Start Game
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAUSE MODAL */}
          {gameState === 'PAUSED' && (
            <div className="absolute inset-0 bg-[#0D1711]/75 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#16271C] border border-white/15 rounded-2xl p-6 text-center shadow-2xl">
                <h2 className="font-[var(--font-display)] text-2xl font-bold text-[#F4F1E8]">
                  Game Paused
                </h2>
                <p className="mt-1.5 text-sm text-[#B8C7B3]">
                  Stage {levelIndex + 1} · {currentLevel.name}
                </p>

                <div className="mt-6 flex flex-col gap-2.5">
                  <button
                    type="button"
                    onClick={handlePauseToggle}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#D4A442] hover:bg-[#E2B452] text-[#1D1609] font-bold text-sm transition-colors cursor-pointer"
                  >
                    Resume
                  </button>
                  <button
                    type="button"
                    onClick={restartCurrentLevel}
                    className="w-full py-2.5 px-4 rounded-xl bg-white/8 hover:bg-white/14 text-[#F4F1E8] font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Restart Level
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-white/5 text-[#B8C7B3] font-medium text-sm transition-colors cursor-pointer"
                  >
                    Back to Title
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STAGE CLEAR MODAL */}
          {gameState === 'STAGE_CLEAR' && (
            <div className="absolute inset-0 bg-[#0D1711]/78 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#16271C] border border-white/15 rounded-2xl p-6 sm:p-7 text-center shadow-2xl">
                <p className="text-xs font-semibold tracking-wider text-[#E7C25D]">
                  Castle Gate Reached
                </p>
                <h2 className="mt-1 font-[var(--font-display)] text-3xl font-bold text-[#F4F1E8]">
                  {currentLevel.name} Clear
                </h2>

                <div className="mt-5 grid grid-cols-3 gap-3 py-4 border-y border-white/10">
                  <div>
                    <div className="text-xs text-[#9FB09A]">Acorns</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-[#F4D371]">
                      {hud.acornsCollected}/{hud.totalAcorns}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9FB09A]">Critters</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-[#F4F1E8]">
                      {hud.enemiesDefeated}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9FB09A]">Time</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-[#F4F1E8]">
                      {formatTime(hud.elapsedSeconds)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={restartCurrentLevel}
                    className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 text-[#F4F1E8] font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Replay Stage
                  </button>
                  <button
                    type="button"
                    onClick={nextLevel}
                    className="px-6 py-2.5 rounded-xl bg-[#D4A442] hover:bg-[#E2B555] text-[#1D1609] font-bold text-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Next Level
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* GAME OVER MODAL */}
          {gameState === 'GAME_OVER' && (
            <div className="absolute inset-0 bg-[#140E0E]/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-[#1C241E] border border-white/15 rounded-2xl p-6 text-center shadow-2xl">
                <h2 className="font-[var(--font-display)] text-2xl sm:text-3xl font-bold text-[#F4F1E8]">
                  Bramble Fainted
                </h2>
                <p className="mt-2 text-sm text-[#B8C7B3]">
                  Watch for thorny beetles and leap cleanly between mossy ledges.
                </p>

                <div className="mt-5 flex items-center justify-center gap-4 text-sm text-[#D6DFD2] py-3 border-y border-white/10 font-mono tabular-nums">
                  <span>Acorns {hud.acornsCollected}/{hud.totalAcorns}</span>
                  <span aria-hidden="true">·</span>
                  <span>Time {formatTime(hud.elapsedSeconds)}</span>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 text-[#F4F1E8] font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Title Menu
                  </button>
                  <button
                    type="button"
                    onClick={restartCurrentLevel}
                    className="px-6 py-2.5 rounded-xl bg-[#D4A442] hover:bg-[#E2B555] text-[#1D1609] font-bold text-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FULL VICTORY MODAL */}
          {gameState === 'VICTORY' && (
            <div className="absolute inset-0 bg-[#0D1711]/82 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-[#16271C] border border-[#E7C25D]/30 rounded-2xl p-6 sm:p-8 text-center shadow-2xl">
                <p className="text-xs font-semibold tracking-wider text-[#E7C25D]">
                  Quest Complete
                </p>
                <h2 className="mt-1 font-[var(--font-display)] text-3xl font-bold text-[#F4F1E8] text-balance">
                  Hail Sir Bramble
                </h2>
                <p className="mt-2 text-sm text-[#C4D1BF]">
                  You guided the hedgehog knight safely through all three woodland stages to the Royal Gatehouse.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3 py-4 border-y border-white/10">
                  <div>
                    <div className="text-xs text-[#9FB09A]">Total Acorns</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-[#F4D371]">
                      {totalStats.acorns}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9FB09A]">Critters</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-[#F4F1E8]">
                      {totalStats.enemies}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-[#9FB09A]">Total Time</div>
                    <div className="mt-1 font-mono tabular-nums text-lg font-semibold text-[#F4F1E8]">
                      {formatTime(totalStats.time)}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setGameState('TITLE_MENU')}
                    className="px-4 py-2.5 rounded-xl bg-white/8 hover:bg-white/14 text-[#F4F1E8] font-semibold text-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Title Menu
                  </button>
                  <button
                    type="button"
                    onClick={() => startGame(0)}
                    className="px-6 py-2.5 rounded-xl bg-[#D4A442] hover:bg-[#E2B555] text-[#1D1609] font-bold text-sm transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Play Again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
