// lab.html strip B: draws into a transferred OffscreenCanvas on its own clock.
// A worker's frames go to the UI process directly, without waiting for the
// page's 60 fps rendering update (WebKit: PlaceholderRenderingContext).
import { drawScene } from './scene.js';

let ctx = null;
let size = { w: 0, h: 0, dpr: 1 };
let pace = 120;
let timer = 0;
let draws = 0;
let worstGap = 0;
let lastDraw = 0;

function draw() {
  const now = performance.now();
  if (lastDraw) worstGap = Math.max(worstGap, now - lastDraw);
  lastDraw = now;
  draws++;
  drawScene(ctx, size.w, size.h, now / 1000, size.dpr);
}

// Draws every 1/pace s against an absolute schedule (no drift), resyncing if it
// falls behind.
function start() {
  clearTimeout(timer);
  const step = 1000 / pace;
  let next = performance.now();
  const tick = () => {
    draw();
    next += step;
    const now = performance.now();
    if (next < now - step) next = now;
    timer = setTimeout(tick, Math.max(0, next - now));
  };
  tick();
}

self.onmessage = (e) => {
  const d = e.data;
  if (d.canvas) {
    ctx = d.canvas.getContext('2d', { alpha: false });
    size = { w: d.canvas.width, h: d.canvas.height, dpr: d.dpr };
  }
  if (d.pace) pace = d.pace;
  if (ctx) start();
};

setInterval(() => {
  self.postMessage({ draws, worstGap, pace });
  draws = 0;
  worstGap = 0;
}, 1000);
