// Draws the real collision shapes (?hitboxes, or hitboxes.html): the
// pixel masks the game tests against, plus bounding boxes and circles.
// Red = lethal, cyan = bird, green = collectible, yellow = ground line.
const tints = new WeakMap(); // mask -> tinted canvas

function tinted(mask, color) {
  let byColor = tints.get(mask);
  if (!byColor) tints.set(mask, (byColor = new Map()));
  let c = byColor.get(color);
  if (!c) {
    c = document.createElement('canvas');
    c.width = mask.w;
    c.height = mask.h;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(mask.w, mask.h);
    const [r, g, b] = color.split(',').map(Number);
    for (let i = 0; i < mask.data.length; i++) {
      if (!mask.data[i]) continue;
      img.data.set([r, g, b, 150], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    byColor.set(color, c);
  }
  return c;
}

const RED = '255,40,40';
const CYAN = '0,230,255';

function box(ctx, mask, x, y, color, stroke) {
  x = Math.round(x);
  y = Math.round(y);
  ctx.drawImage(tinted(mask, color), x, y);
  ctx.strokeStyle = stroke;
  ctx.strokeRect(x + 0.5, y + 0.5, mask.w - 1, mask.h - 1);
}

function circle(ctx, x, y, radius, color) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = color.replace(')', ',0.35)').replace('rgb', 'rgba');
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
}

export function renderHitboxes(r, scene) {
  const ctx = r.ctx;
  const sp = scene.game.sprites;
  const CFG = scene.game.config;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.lineWidth = 1;

  // Pipes
  const pipes = scene.pipes;
  const pm = sp.mask(pipes.sprite);
  const pmf = sp.mask(pipes.sprite, true);
  for (const p of pipes.list) {
    box(ctx, pmf, p.x, p.gapY - pipes.img.height, RED, 'rgba(255,40,40,0.9)');
    box(ctx, pm, p.x, p.gapY + p.gap, RED, 'rgba(255,40,40,0.9)');
  }

  // Boss
  const boss = scene.bosses.boss;
  if (boss && !boss.defeated && !boss.reviving) {
    box(ctx, sp.mask(boss.frameName), boss.x, boss.y, RED, 'rgba(255,40,40,0.9)');
  }

  // Projectiles and pickups
  for (const o of scene.hazards.list) {
    if (o.hits) circle(ctx, o.x, o.y, o.radius, 'rgb(255,40,40)');
    else if (o.touches) circle(ctx, o.x, o.y, o.radius, 'rgb(60,255,90)');
  }

  // Ground: touching this line counts as a hit
  const gy = CFG.groundY - 1;
  ctx.fillStyle = 'rgba(255,235,59,0.9)';
  ctx.fillRect(0, gy, CFG.width, 1);

  // Bird (drawn last so it stays visible on top)
  const b = scene.bird;
  box(ctx, b.mask, b.x, b.y, CYAN, 'rgba(0,230,255,0.9)');
  ctx.restore();
}
