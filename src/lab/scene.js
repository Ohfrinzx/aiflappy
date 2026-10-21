// Test scene for lab.html: pipes scrolling at the game's speed plus a bouncing
// block, drawn for time t (seconds). Shared by the main thread and the worker.
const SPEED = 168; // CSS px per second (the game's 120 px/s at phone scale)
const GAP = 140; // CSS px between pipes
const PIPE = 44;

export function drawScene(ctx, w, h, t, dpr) {
  ctx.fillStyle = '#4ec0ca';
  ctx.fillRect(0, 0, w, h);
  const gap = GAP * dpr;
  const off = (t * SPEED * dpr) % gap;
  ctx.fillStyle = '#73bf2e';
  for (let x = -off; x < w; x += gap) {
    const px = Math.round(x);
    ctx.fillRect(px, 0, PIPE * dpr, h * 0.3);
    ctx.fillRect(px, h * 0.7, PIPE * dpr, h * 0.3);
  }
  // Bouncing block: a parabola like the bird's flap arc, one hop per 0.6 s.
  const k = (t % 0.6) / 0.6;
  const size = 22 * dpr;
  const y = h * 0.62 - 4 * k * (1 - k) * h * 0.3 - size;
  ctx.fillStyle = '#f8b733';
  ctx.fillRect(Math.round(w * 0.25), Math.round(y), size, size);
}
