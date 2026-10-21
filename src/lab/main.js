// Hitch lab (lab.html): the same scrolling scene drawn two ways, to see whether
// drawing from a worker avoids the per-tap hitch on ProMotion iPhones.
// A: main-thread canvas on requestAnimationFrame, like the game. With Safari's
//    default "Prefer Page Rendering Updates near 60fps" this runs at 60 fps
//    off a display link that a touch knocks out of step.
// B: an OffscreenCanvas in a worker, paced by its own clock (see worker.js).
import { startKeepalive } from '../core/keepalive.js';
import { drawScene } from './scene.js';

function fit(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * dpr);
  canvas.height = Math.round(r.height * dpr);
  return dpr;
}

// A: main thread.
const mainCanvas = document.getElementById('main');
const mainDpr = fit(mainCanvas);
const ctx = mainCanvas.getContext('2d', { alpha: false });
const stats = { frames: 0, slow: 0, taps: 0, tapHitches: 0 };
let tapPending = false;
let last = 0;
function frame(t) {
  if (last) {
    const gap = t - last;
    stats.frames++;
    if (gap > 25) stats.slow++;
    if (tapPending) {
      stats.taps++;
      if (gap > 25) stats.tapHitches++;
    }
  }
  tapPending = false;
  last = t;
  drawScene(ctx, mainCanvas.width, mainCanvas.height, t / 1000, mainDpr);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
document.addEventListener('touchstart', () => (tapPending = true), { passive: true });
document.addEventListener('mousedown', () => (tapPending = true));

// B: worker.
const workerCanvas = document.getElementById('worker');
const workerDpr = fit(workerCanvas);
let workerStats = { draws: 0, worstGap: 0 };
let worker = null;
if (workerCanvas.transferControlToOffscreen) {
  const offscreen = workerCanvas.transferControlToOffscreen();
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => (workerStats = e.data);
  worker.postMessage({ canvas: offscreen, dpr: workerDpr, pace: 120 }, [offscreen]);
}

// Controls.
let pace = 120;
let keepalive = null;
const buttons = [...document.querySelectorAll('button')];
function refresh() {
  for (const b of buttons) {
    b.classList.toggle('on', b.dataset.pace ? Number(b.dataset.pace) === pace : b.dataset.keep === (keepalive?.mode ?? 'off'));
  }
}
for (const b of buttons) {
  b.addEventListener('click', () => {
    if (b.dataset.pace) {
      pace = Number(b.dataset.pace);
      worker?.postMessage({ pace });
    } else {
      keepalive?.stop();
      keepalive = startKeepalive(b.dataset.keep);
    }
    refresh();
  });
}
refresh();

// Stats, updated twice a second (not on taps, to keep tap frames cheap).
const out = document.getElementById('stats');
let lastStats = { ...stats };
setInterval(() => {
  const fps = (stats.frames - lastStats.frames) * 2;
  lastStats = { ...stats };
  out.textContent = [
    `A: ${fps} fps   tap hitches ${stats.tapHitches}/${stats.taps}   other slow ${stats.slow - stats.tapHitches}/${stats.frames}`,
    worker ? `B: ${workerStats.draws} draws/s (target ${pace})   worst gap ${workerStats.worstGap.toFixed(1)} ms` : 'B: OffscreenCanvas not supported here',
  ].join('\n');
}, 500);

window.__lab = { stats, get workerStats() { return workerStats; }, get keepalive() { return keepalive; } };
