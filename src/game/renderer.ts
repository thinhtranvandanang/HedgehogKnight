import {
  AcornRuntime,
  CastleDef,
  EnemyRuntime,
  Firefly,
  Particle,
  PlatformRuntime,
  PlayerState,
} from './types';

export const LOGICAL_HEIGHT = 540;

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  rTopLeft: number,
  rTopRight: number,
  rBottomRight: number,
  rBottomLeft: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + rTopLeft, y);
  ctx.lineTo(x + w - rTopRight, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rTopRight);
  ctx.lineTo(x + w, y + h - rBottomRight);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rBottomRight, y + h);
  ctx.lineTo(x + rBottomLeft, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rBottomLeft);
  ctx.lineTo(x, y + rTopLeft);
  ctx.quadraticCurveTo(x, y, x + rTopLeft, y);
  ctx.closePath();
}

export function drawForestBackground(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  cameraX: number,
  time: number,
  fireflies: Firefly[]
): void {
  // 1. Misty golden-sage sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
  skyGrad.addColorStop(0, '#D9DEC0');
  skyGrad.addColorStop(0.28, '#DCE2C5');
  skyGrad.addColorStop(0.62, '#7D9880');
  skyGrad.addColorStop(1, '#2B4736');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  // Soft warm sunlit glow in center-upper sky
  const sunGrad = ctx.createRadialGradient(
    viewW * 0.52,
    viewH * 0.24,
    20,
    viewW * 0.52,
    viewH * 0.24,
    viewH * 0.65
  );
  sunGrad.addColorStop(0, 'rgba(255, 251, 224, 0.52)');
  sunGrad.addColorStop(0.55, 'rgba(232, 236, 198, 0.16)');
  sunGrad.addColorStop(1, 'rgba(232, 236, 198, 0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  // 2. Distant fairytale castle silhouette in the misty horizon
  const castleParallax = cameraX * 0.08;
  const distantCenter = viewW * 0.58 - (castleParallax % (viewW * 1.4)) + viewW * 0.15;
  ctx.save();
  ctx.fillStyle = 'rgba(138, 152, 130, 0.36)';
  const baseY = viewH * 0.56;
  // Left turret
  ctx.fillRect(distantCenter - 70, baseY - 95, 28, 110);
  ctx.beginPath();
  ctx.moveTo(distantCenter - 73, baseY - 95);
  ctx.lineTo(distantCenter - 56, baseY - 135);
  ctx.lineTo(distantCenter - 39, baseY - 95);
  ctx.closePath();
  ctx.fill();
  // Main keep
  ctx.fillRect(distantCenter - 42, baseY - 75, 84, 90);
  // Central tall spire
  ctx.fillRect(distantCenter - 16, baseY - 140, 32, 85);
  ctx.beginPath();
  ctx.moveTo(distantCenter - 20, baseY - 140);
  ctx.lineTo(distantCenter, baseY - 190);
  ctx.lineTo(distantCenter + 20, baseY - 140);
  ctx.closePath();
  ctx.fill();
  // Right turret
  ctx.fillRect(distantCenter + 42, baseY - 105, 30, 120);
  ctx.beginPath();
  ctx.moveTo(distantCenter + 39, baseY - 105);
  ctx.lineTo(distantCenter + 57, baseY - 148);
  ctx.lineTo(distantCenter + 75, baseY - 105);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 3. Far misty pine & oak silhouettes
  const farTreesSpacing = 170;
  const farShift = (cameraX * 0.16) % farTreesSpacing;
  ctx.fillStyle = 'rgba(94, 122, 100, 0.32)';
  for (let x = -farShift - 80; x < viewW + 120; x += farTreesSpacing) {
    const idx = Math.round((x + cameraX * 0.16) / farTreesSpacing);
    const trunkW = 24 + ((idx * 17) % 16);
    ctx.fillRect(x, 0, trunkW, viewH * 0.88);
  }

  // 4. Midground sunlit tree trunks
  const midSpacing = 240;
  const midShift = (cameraX * 0.34) % midSpacing;
  for (let i = -1; i < Math.ceil(viewW / midSpacing) + 2; i++) {
    const worldIdx = Math.floor((cameraX * 0.34) / midSpacing) + i;
    const x = i * midSpacing - midShift + ((worldIdx * 53) % 45);
    const trunkW = 36 + ((Math.abs(worldIdx) * 19) % 24);

    const trunkGrad = ctx.createLinearGradient(x, 0, x + trunkW, 0);
    trunkGrad.addColorStop(0, '#5E5341');
    trunkGrad.addColorStop(0.7, '#756852');
    trunkGrad.addColorStop(1, '#9E9375');
    ctx.fillStyle = trunkGrad;
    ctx.fillRect(x, 0, trunkW, viewH * 0.92);

    // Subtle branch fork near top
    ctx.fillStyle = '#5E5341';
    ctx.beginPath();
    ctx.moveTo(x + trunkW * 0.65, 95);
    ctx.lineTo(x + trunkW + 38, 12);
    ctx.lineTo(x + trunkW + 52, 22);
    ctx.lineTo(x + trunkW * 0.85, 118);
    ctx.closePath();
    ctx.fill();
  }

  // 5. Misty lower woodland fog
  const mistGrad = ctx.createLinearGradient(0, viewH * 0.54, 0, viewH);
  mistGrad.addColorStop(0, 'rgba(130, 160, 134, 0)');
  mistGrad.addColorStop(0.55, 'rgba(78, 114, 92, 0.35)');
  mistGrad.addColorStop(1, 'rgba(28, 52, 39, 0.88)');
  ctx.fillStyle = mistGrad;
  ctx.fillRect(0, viewH * 0.54, viewW, viewH * 0.46);

  // 6. Top framing leafy canopy clusters
  const canopySpacing = 135;
  const canopyShift = (cameraX * 0.42) % canopySpacing;
  for (let i = -1; i < Math.ceil(viewW / canopySpacing) + 2; i++) {
    const cx = i * canopySpacing - canopyShift + 30;
    const cy = 18 + Math.sin(i * 1.7) * 14;
    ctx.fillStyle = 'rgba(54, 83, 62, 0.72)';
    ctx.beginPath();
    ctx.arc(cx, cy, 48, 0, Math.PI * 2);
    ctx.arc(cx + 38, cy + 12, 36, 0, Math.PI * 2);
    ctx.arc(cx - 32, cy + 14, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(116, 146, 94, 0.48)';
    ctx.beginPath();
    ctx.arc(cx + 10, cy + 10, 26, 0, Math.PI * 2);
    ctx.arc(cx - 18, cy + 20, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Soft glowing forest fireflies
  for (const f of fireflies) {
    const px = ((f.x - cameraX * 0.55) % (viewW + 120) + (viewW + 120)) % (viewW + 120) - 60;
    const py = f.y + Math.sin(time * 1.8 + f.phase) * 14;
    const pulse = 0.45 + 0.55 * Math.sin(time * 3.1 + f.phase);
    const alpha = f.alpha * pulse;

    const glow = ctx.createRadialGradient(px, py, 0, px, py, f.radius * 4.5);
    glow.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
    glow.addColorStop(0.5, `rgba(250, 204, 21, ${alpha * 0.35})`);
    glow.addColorStop(1, 'rgba(250, 204, 21, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(px, py, f.radius * 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 251, 210, ${Math.min(1, alpha + 0.25)})`;
    ctx.beginPath();
    ctx.arc(px, py, f.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPlatform(
  ctx: CanvasRenderingContext2D,
  p: PlatformRuntime
): void {
  const { x, y, width, height } = p;
  const grassH = 18;

  // Drop shadow beneath platform
  ctx.fillStyle = 'rgba(16, 30, 21, 0.28)';
  drawRoundedRectPath(ctx, x + 3, y + 6, width, height, 6, 6, 16, 16);
  ctx.fill();

  // Earthy brown dirt body
  ctx.fillStyle = '#4E3929';
  drawRoundedRectPath(ctx, x, y + 4, width, height - 4, 4, 4, 15, 15);
  ctx.fill();

  // Subtle horizontal oval pebbles inside soil (matching screenshot texture)
  ctx.fillStyle = '#674D3A';
  const cols = Math.max(2, Math.floor((width - 28) / 48));
  const rows = height > 95 ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    const py = y + 48 + r * 28;
    if (py > y + height - 14) continue;
    for (let c = 0; c < cols; c++) {
      const px = x + 26 + c * 48 + (r % 2) * 20;
      if (px + 10 < x + width - 16) {
        ctx.beginPath();
        ctx.ellipse(px, py, 9, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Green grass overhangs dripping into the dirt
  ctx.fillStyle = '#4B7D34';
  const dripSpacing = 44;
  const dripCount = Math.max(2, Math.floor((width - 18) / dripSpacing));
  for (let i = 0; i < dripCount; i++) {
    const dx = x + 16 + i * dripSpacing + ((i % 2) * 8);
    if (dx + 12 > x + width - 10) break;
    const dripH = 14 + (i % 3) * 6;
    ctx.beginPath();
    ctx.roundRect(dx, y + grassH - 3, 11, dripH, 5.5);
    ctx.fill();
  }

  // Main grass turf cap
  ctx.fillStyle = '#528739';
  ctx.beginPath();
  ctx.roundRect(x - 1, y, width + 2, grassH, [5, 5, 4, 4]);
  ctx.fill();

  // Sunlit top grass strip
  ctx.fillStyle = '#75AE4E';
  ctx.beginPath();
  ctx.roundRect(x - 1, y, width + 2, 10, [5, 5, 2, 2]);
  ctx.fill();

  // Crisp little 'v' grass blades along the top (signature screenshot detail)
  ctx.strokeStyle = '#8CC462';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let gx = x + 14; gx < x + width - 14; gx += 36) {
    ctx.beginPath();
    ctx.moveTo(gx - 4, y - 4);
    ctx.lineTo(gx, y + 1);
    ctx.lineTo(gx + 4, y - 5);
    ctx.stroke();
  }
}

export function drawAcorn(
  ctx: CanvasRenderingContext2D,
  acorn: AcornRuntime,
  time: number
): void {
  if (acorn.collected) return;

  const bobY = acorn.y + Math.sin(time * 3.4 + acorn.bobOffset) * 5;
  const x = acorn.x;

  // Warm golden aura glow
  const glow = ctx.createRadialGradient(x, bobY, 3, x, bobY, 26);
  glow.addColorStop(0, 'rgba(253, 224, 71, 0.55)');
  glow.addColorStop(0.55, 'rgba(251, 191, 36, 0.2)');
  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, bobY, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, bobY);

  // Acorn golden body
  ctx.fillStyle = '#F5C451';
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.quadraticCurveTo(-11, 12, 0, 15);
  ctx.quadraticCurveTo(11, 12, 10, -2);
  ctx.closePath();
  ctx.fill();

  // Inner highlight
  ctx.fillStyle = '#FDE68A';
  ctx.beginPath();
  ctx.ellipse(-3, 5, 3, 5.5, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Acorn cap
  ctx.fillStyle = '#8B5A2B';
  ctx.beginPath();
  ctx.ellipse(0, -3, 12.5, 5.5, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(12.5, -1);
  ctx.quadraticCurveTo(0, 2, -12.5, -1);
  ctx.closePath();
  ctx.fill();

  // Stem
  ctx.strokeStyle = '#6B4220';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(2, -13);
  ctx.stroke();

  ctx.restore();
}

export function drawCastle(
  ctx: CanvasRenderingContext2D,
  castle: CastleDef,
  doorOpenProgress: number,
  time: number
): void {
  const { x, y, width, height, bannerColor = '#C23B4B' } = castle;

  ctx.save();

  // Warm lantern glow when player approaches / opens door
  if (doorOpenProgress > 0.02) {
    const cx = x + width * 0.56;
    const cy = y + height - 65;
    const warm = ctx.createRadialGradient(cx, cy, 10, cx, cy, 130);
    warm.addColorStop(0, `rgba(253, 224, 71, ${0.45 * doorOpenProgress})`);
    warm.addColorStop(1, 'rgba(253, 224, 71, 0)');
    ctx.fillStyle = warm;
    ctx.beginPath();
    ctx.arc(cx, cy, 130, 0, Math.PI * 2);
    ctx.fill();
  }

  // Main sage-stone keep body
  const wallTop = y + 32;
  const wallH = height - 32;
  ctx.fillStyle = '#8E9C89';
  ctx.fillRect(x, wallTop, width, wallH);

  // Subtle vertical shading on left & right walls
  ctx.fillStyle = 'rgba(42, 56, 44, 0.14)';
  ctx.fillRect(x, wallTop, 20, wallH);
  ctx.fillStyle = 'rgba(255, 255, 240, 0.1)';
  ctx.fillRect(x + width - 16, wallTop, 16, wallH);

  // Subtle stone masonry lines
  ctx.fillStyle = 'rgba(54, 68, 55, 0.14)';
  ctx.fillRect(x + 26, wallTop + 34, 34, 14);
  ctx.fillRect(x + width - 58, wallTop + 48, 32, 14);
  ctx.fillRect(x + 18, wallTop + 128, 28, 14);

  // Battlements / Crenellations along the roof
  const merlonCount = 4;
  const merlonW = 34;
  const gap = (width - merlonCount * merlonW) / (merlonCount - 1);
  for (let i = 0; i < merlonCount; i++) {
    const mx = x + i * (merlonW + gap);
    ctx.fillStyle = '#9BA996';
    ctx.fillRect(mx, y, merlonW, 34);
    ctx.fillStyle = '#B5C2AF';
    ctx.fillRect(mx, y, merlonW, 6);
  }

  // Hanging crimson heraldic banner on the left side (matching screenshot!)
  const sway = Math.sin(time * 2.2) * 3;
  ctx.fillStyle = '#3E2E22';
  ctx.fillRect(x - 6, wallTop + 6, 46, 5);
  ctx.fillStyle = bannerColor;
  ctx.beginPath();
  ctx.moveTo(x - 2, wallTop + 10);
  ctx.lineTo(x + 36, wallTop + 10);
  ctx.lineTo(x + 36 + sway, wallTop + 96);
  ctx.lineTo(x + 17 + sway, wallTop + 82);
  ctx.lineTo(x - 2 + sway, wallTop + 96);
  ctx.closePath();
  ctx.fill();

  // Gold trim stripe on banner
  ctx.fillStyle = '#E5B94E';
  ctx.fillRect(x + 2, wallTop + 14, 30, 3);

  // Arched dark-green stone doorway frame
  const doorW = 104;
  const doorH = 148;
  const doorX = x + width * 0.56 - doorW / 2;
  const doorY = y + height - doorH;
  const archR = doorW / 2;

  ctx.fillStyle = '#193727';
  ctx.beginPath();
  ctx.moveTo(doorX - 13, y + height);
  ctx.lineTo(doorX - 13, doorY + archR);
  ctx.arc(doorX + archR, doorY + archR, archR + 13, Math.PI, 0, false);
  ctx.lineTo(doorX + doorW + 13, y + height);
  ctx.closePath();
  ctx.fill();

  // Inner golden light behind door when open
  ctx.fillStyle = '#2B1B10';
  ctx.beginPath();
  ctx.moveTo(doorX, y + height);
  ctx.lineTo(doorX, doorY + archR);
  ctx.arc(doorX + archR, doorY + archR, archR, Math.PI, 0, false);
  ctx.lineTo(doorX + doorW, y + height);
  ctx.closePath();
  ctx.fill();

  if (doorOpenProgress > 0.01) {
    ctx.fillStyle = `rgba(253, 230, 138, ${0.85 * doorOpenProgress})`;
    ctx.fill();
  }

  // Wooden planked door (scales horizontally as it swings open!)
  const closedScale = Math.max(0.18, 1 - doorOpenProgress * 0.82);
  ctx.save();
  ctx.translate(doorX, 0);
  ctx.scale(closedScale, 1);

  ctx.fillStyle = '#5B3E26';
  ctx.beginPath();
  ctx.moveTo(0, y + height);
  ctx.lineTo(0, doorY + archR);
  ctx.arc(archR, doorY + archR, archR, Math.PI, 0, false);
  ctx.lineTo(doorW, y + height);
  ctx.closePath();
  ctx.fill();

  // Plank grooves
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#3F2917';
  ctx.lineWidth = 2.5;
  for (let px = 20; px < doorW; px += 21) {
    ctx.beginPath();
    ctx.moveTo(px, doorY);
    ctx.lineTo(px, y + height);
    ctx.stroke();
  }
  ctx.restore();

  // Round golden doorknob
  ctx.fillStyle = '#E8BE4B';
  ctx.beginPath();
  ctx.arc(doorW * 0.76, doorY + doorH * 0.56, 6.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#A1781D';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyRuntime,
  time: number
): void {
  if (!enemy.alive && enemy.squashTimer <= 0) return;

  const cx = enemy.x + enemy.width / 2;
  const bottomY = enemy.y;
  const facing = enemy.vx >= 0 ? 1 : -1;

  ctx.save();
  ctx.translate(cx, bottomY);
  if (!enemy.alive) {
    ctx.scale(1.35, 0.32);
    ctx.globalAlpha = Math.max(0, enemy.squashTimer / 0.35);
  } else {
    const bounce = Math.abs(Math.sin(time * 7 + enemy.animPhase));
    ctx.scale(facing * (1 + bounce * 0.05), 1 - bounce * 0.06);
  }

  if (enemy.kind === 'beetle') {
    // Thorny Forest Beetle
    // Little legs
    const legSwing = Math.sin(time * 16 + enemy.animPhase) * 3;
    ctx.strokeStyle = '#241B18';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    [-10, -2, 7].forEach((lx, i) => {
      ctx.beginPath();
      ctx.moveTo(lx, -5);
      ctx.lineTo(lx + (i % 2 === 0 ? legSwing : -legSwing), 0);
      ctx.stroke();
    });

    // Dark violet-brown armored shell
    ctx.fillStyle = '#4A344D';
    ctx.beginPath();
    ctx.arc(0, -6, 15, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#251927';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dorsal spikes
    ctx.fillStyle = '#D97757';
    [-7, 0, 7].forEach((sx) => {
      ctx.beginPath();
      ctx.moveTo(sx - 3, -19 + Math.abs(sx) * 0.45);
      ctx.lineTo(sx, -26 + Math.abs(sx) * 0.45);
      ctx.lineTo(sx + 3, -19 + Math.abs(sx) * 0.45);
      ctx.closePath();
      ctx.fill();
    });

    // Angry amber eyes
    ctx.fillStyle = '#FEF08A';
    ctx.beginPath();
    ctx.arc(8, -10, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1C1917';
    ctx.beginPath();
    ctx.arc(9, -10, 1.4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Mossy Bramble Slime
    const wobble = Math.sin(time * 6 + enemy.animPhase) * 1.5;
    ctx.fillStyle = '#4D7C46';
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.quadraticCurveTo(-17, -23 + wobble, 0, -24 + wobble);
    ctx.quadraticCurveTo(17, -23 + wobble, 16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#264222';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cute leaf sprout on top
    ctx.fillStyle = '#84CC16';
    ctx.beginPath();
    ctx.ellipse(2, -26 + wobble, 6, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(5, -11, 3.5, 0, Math.PI * 2);
    ctx.arc(11, -11, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1A2E05';
    ctx.beginPath();
    ctx.arc(6, -11, 1.6, 0, Math.PI * 2);
    ctx.arc(11.5, -11, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function drawBramble(
  ctx: CanvasRenderingContext2D,
  player: PlayerState,
  time: number
): void {
  // Blink during invulnerability frames
  if (player.invulnTimer > 0 && Math.floor(player.invulnTimer * 16) % 2 === 0) {
    return;
  }

  const centerX = player.x + player.width / 2;
  const footY = player.y + player.height;

  ctx.save();
  ctx.translate(centerX, footY);

  // Ground shadow when near platforms
  if (player.onGround) {
    ctx.fillStyle = 'rgba(18, 32, 22, 0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 16, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.scale(player.facing * player.squashX, player.squashY);

  // Calculate procedural animation offsets
  const isRun = player.anim === 'run';
  const isJump = player.anim === 'jump';
  const isFall = player.anim === 'fall';
  const isVictory = player.anim === 'victory';

  const runCycle = player.animTime * 15;
  const idleBreath = Math.sin(time * 3.5) * 1.4;
  const bodyBobY = isRun
    ? -Math.abs(Math.sin(runCycle)) * 4.5
    : isJump
      ? -2
      : isVictory
        ? -Math.abs(Math.sin(time * 8)) * 6
        : idleBreath * 0.5;
  const bodyTilt = isRun ? 0.08 : isJump ? -0.1 : isFall ? 0.07 : 0;

  ctx.translate(0, bodyBobY);
  ctx.rotate(bodyTilt);

  // 1. Flowing crimson scarf tail behind Bramble
  const scarfFlutter = Math.sin(player.scarfWave) * 5;
  const speedStretch = isRun ? 10 : isJump || isFall ? 7 : 0;
  ctx.fillStyle = '#C93848';
  ctx.strokeStyle = '#5B1A22';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-6, -24);
  ctx.quadraticCurveTo(
    -20 - speedStretch * 0.5,
    -25 + scarfFlutter * 0.6,
    -30 - speedStretch,
    -21 + scarfFlutter
  );
  ctx.lineTo(-27 - speedStretch, -15 + scarfFlutter);
  ctx.quadraticCurveTo(
    -17 - speedStretch * 0.4,
    -17 + scarfFlutter * 0.5,
    -5,
    -18
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Secondary lower scarf ribbon
  ctx.beginPath();
  ctx.moveTo(-7, -20);
  ctx.quadraticCurveTo(
    -18 - speedStretch * 0.4,
    -14 - scarfFlutter * 0.5,
    -24 - speedStretch * 0.8,
    -11 - scarfFlutter * 0.8
  );
  ctx.lineTo(-21 - speedStretch * 0.8, -7 - scarfFlutter * 0.8);
  ctx.quadraticCurveTo(-14, -10, -6, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Back foot (brown knight boot)
  const backLegSwing = isRun ? Math.sin(runCycle + Math.PI) * 7 : isJump ? -4 : isFall ? 3 : 0;
  const backLegLift = isRun ? Math.max(0, -Math.cos(runCycle + Math.PI) * 4.5) : isJump ? 4 : 0;
  ctx.fillStyle = '#6D3F2A';
  ctx.strokeStyle = '#2B1B12';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-8 + backLegSwing, -8 - backLegLift, 11, 8, [3, 4, 2, 2]);
  ctx.fill();
  ctx.stroke();

  // 3. Spiky hedgehog back quills (dark olive green)
  ctx.fillStyle = '#4E6345';
  ctx.strokeStyle = '#222D1E';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-8, -33);
  ctx.lineTo(-17, -30);
  ctx.lineTo(-12, -25);
  ctx.lineTo(-20, -21);
  ctx.lineTo(-13, -17);
  ctx.lineTo(-19, -12);
  ctx.lineTo(-10, -10);
  ctx.lineTo(-14, -6);
  ctx.lineTo(-4, -8);
  ctx.arc(0, -21, 14, Math.PI * 0.65, Math.PI * 1.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner quill highlight spikes
  ctx.fillStyle = '#657E59';
  ctx.beginPath();
  ctx.moveTo(-8, -28);
  ctx.lineTo(-14, -24);
  ctx.lineTo(-9, -20);
  ctx.lineTo(-13, -15);
  ctx.lineTo(-6, -14);
  ctx.closePath();
  ctx.fill();

  // 4. Soft cream-sage hedgehog belly & face
  ctx.fillStyle = '#C9D5B5';
  ctx.strokeStyle = '#222D1E';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(3, -17, 11.5, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cute snout
  ctx.fillStyle = '#D7E2C6';
  ctx.beginPath();
  ctx.ellipse(11, -24, 9.5, 7.5, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Back of head / ear
  ctx.fillStyle = '#B7C4A3';
  ctx.beginPath();
  ctx.ellipse(-2, -28, 3.5, 4.5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Cute button nose
  ctx.fillStyle = '#231F20';
  ctx.beginPath();
  ctx.ellipse(19.5, -24.5, 2.3, 1.9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Expressive eye (blinks periodically during idle)
  const isBlinking = player.anim === 'idle' && Math.sin(time * 2.1) > 0.96;
  if (isBlinking) {
    ctx.strokeStyle = '#231F20';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(9.5, -26.5);
    ctx.lineTo(13.5, -26.5);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1E1B18';
    ctx.beginPath();
    ctx.arc(11.5, -26.8, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(12.2, -27.5, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cheerful smile
  ctx.strokeStyle = '#2D3426';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(14.5, -22.5, 2.6, 0.15, Math.PI * 0.72);
  ctx.stroke();

  // 5. Front foot (brown knight boot)
  const frontLegSwing = isRun ? Math.sin(runCycle) * 7.5 : isJump ? 5 : isFall ? -2 : 0;
  const frontLegLift = isRun ? Math.max(0, -Math.cos(runCycle) * 4.5) : isJump ? 2 : 0;
  ctx.fillStyle = '#7E4B33';
  ctx.strokeStyle = '#2B1B12';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-2 + frontLegSwing, -8 - frontLegLift, 11.5, 8, [3, 4, 2, 2]);
  ctx.fill();
  ctx.stroke();

  // 6. Cozy red scarf collar around neck
  ctx.fillStyle = '#D64252';
  ctx.strokeStyle = '#5B1A22';
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.roundRect(-8, -22, 21, 6.5, 3.5);
  ctx.fill();
  ctx.stroke();

  // 7. Acorn Cap Helmet!
  ctx.save();
  ctx.translate(2, -31);
  ctx.rotate(-0.14);
  // Helmet dome
  ctx.fillStyle = '#9D5324';
  ctx.strokeStyle = '#3B1E0C';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14.5, 10.5, 0, Math.PI, Math.PI * 2);
  ctx.quadraticCurveTo(14.5, 3, 0, 2.5);
  ctx.quadraticCurveTo(-14.5, 3, -14.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Helmet warm highlight
  ctx.fillStyle = '#BA6A35';
  ctx.beginPath();
  ctx.ellipse(-3, -5, 6.5, 2.6, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // Acorn stem knob on top
  ctx.fillStyle = '#6E3714';
  ctx.beginPath();
  ctx.roundRect(-2.5, -15, 5, 6, 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 8. Front arm & Leafy Twig Sword!
  const slashAngle =
    player.slashTimer > 0
      ? Math.sin((1 - player.slashTimer / 0.22) * Math.PI) * 1.45
      : 0;
  const swordAngle = isVictory
    ? -0.85
    : isRun
      ? 0.2 + Math.sin(runCycle) * 0.14
      : isJump
        ? -0.35
        : Math.sin(time * 3.5) * 0.05;

  ctx.save();
  ctx.translate(7, -15);
  ctx.rotate(swordAngle + slashAngle);

  // Twig sword blade
  ctx.strokeStyle = '#5C3A21';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(15, -14);
  ctx.stroke();

  // Small cross-twig
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(3, -6);
  ctx.lineTo(8, -2);
  ctx.stroke();

  // Sprouting green leaves on the twig sword
  ctx.fillStyle = '#73A942';
  ctx.strokeStyle = '#2A4719';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(15, -15, 4.5, 2.2, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(10, -13, 3.8, 1.9, -1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Slash arc gleam when swinging
  if (player.slashTimer > 0) {
    ctx.strokeStyle = 'rgba(254, 249, 195, 0.78)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(4, -4, 21, -1.1, 0.5);
    ctx.stroke();
  }

  // Tiny paw holding the twig
  ctx.fillStyle = '#C9D5B5';
  ctx.strokeStyle = '#222D1E';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(1, -1, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[]
): void {
  for (const pt of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.alpha * (pt.life / pt.maxLife));
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawForegroundCanopy(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  cameraX: number
): void {
  // Subtle dark-green leafy vignette at bottom edge like in screenshot
  const fgSpacing = 190;
  const fgShift = (cameraX * 1.15) % fgSpacing;
  ctx.fillStyle = 'rgba(22, 40, 29, 0.72)';
  for (let i = -1; i < Math.ceil(viewW / fgSpacing) + 2; i++) {
    const cx = i * fgSpacing - fgShift;
    ctx.beginPath();
    ctx.arc(cx, viewH + 12, 34, 0, Math.PI * 2);
    ctx.arc(cx + 42, viewH + 18, 26, 0, Math.PI * 2);
    ctx.fill();
  }
}
