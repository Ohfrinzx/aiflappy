// Display keepalives: experiments for the iOS per-tap hitch (see CLAUDE.md).
// With Safari's default "Prefer Page Rendering Updates near 60fps" flag, page
// frames come from a 60 Hz display link. Touching the screen boosts a ProMotion
// display to 120 Hz and back, which knocks that 60 Hz cadence out of step. Each
// mode tries to hold the display at 120 Hz from outside WebKit's page display
// link, so a touch has nothing to boost:
//   css    - a compositor (CSS) animation
//   scroll - an invisible overflow box kept smooth-scrolling; on iOS, WebKit
//            hands programmatic smooth scrolls to UIKit's own scroll animation
//            (owner's iPhone, v1.10.1: tap hitches ~100% -> 32/57)
//   fast   - the same, but always fast and one way: ProMotion lowers the
//            refresh rate while a scroll slows down (each reversal / ease-out)
//   video  - a tiny muted 120 fps video loop
//   combo  - fast + video
export const KEEPALIVE_MODES = ['css', 'scroll', 'fast', 'video', 'combo'];

// Near-invisible, never takes touches.
const HIDDEN = 'position:fixed;left:0;top:0;width:8px;height:8px;opacity:0.02;pointer-events:none';

function cssKeepalive() {
  const el = document.createElement('div');
  el.style.cssText = `${HIDDEN};width:2px;height:2px;background:#000;will-change:transform;animation:aiflappy-keepalive 1s linear infinite`;
  const style = document.createElement('style');
  style.textContent = '@keyframes aiflappy-keepalive{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
  document.head.appendChild(style);
  document.body.appendChild(el);
  return {
    stop() {
      el.remove();
      style.remove();
    },
  };
}

function scrollKeepalive() {
  const box = document.createElement('div');
  box.style.cssText = `${HIDDEN};overflow-y:scroll`;
  const inner = document.createElement('div');
  inner.style.height = '4000px';
  box.appendChild(inner);
  document.body.appendChild(box);
  // Re-aim before each smooth scroll settles, so one is always running.
  let down = true;
  const kick = () => {
    box.scrollTo({ top: down ? 3000 : 0, behavior: 'smooth' });
    down = !down;
  };
  kick();
  const timer = setInterval(kick, 250);
  return {
    stop() {
      clearInterval(timer);
      box.remove();
    },
    probe: () => box.scrollTop,
  };
}

function fastScrollKeepalive() {
  const box = document.createElement('div');
  box.style.cssText = `${HIDDEN};width:16px;height:16px;overflow-y:scroll`;
  const inner = document.createElement('div');
  // Faint stripes, so scrolled frames really change pixels without showing
  // (black / white stripes showed through at the top-left corner).
  inner.style.cssText = 'height:200000px;background:repeating-linear-gradient(#808080 0 4px,#888 4px 8px)';
  box.appendChild(inner);
  document.body.appendChild(box);
  // Re-aim far ahead every 100 ms, so the scroll never eases out; turn
  // around only near the ends (every ~6 s).
  let dir = 1;
  const kick = () => {
    const y = box.scrollTop;
    if (y > box.scrollHeight - box.clientHeight - 20000) dir = -1;
    else if (y < 20000) dir = 1;
    box.scrollTo({ top: y + dir * 8000, behavior: 'smooth' });
  };
  kick();
  const timer = setInterval(kick, 100);
  return {
    stop() {
      clearInterval(timer);
      box.remove();
    },
    probe: () => box.scrollTop,
  };
}

function videoKeepalive() {
  const v = document.createElement('video');
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute('muted', '');
  v.setAttribute('playsinline', '');
  v.style.cssText = HIDDEN;
  v.src = 'assets/keepalive-120fps.mp4';
  document.body.appendChild(v);
  const play = () => v.play().catch(() => {}); // autoplay can be refused until a tap
  play();
  return {
    stop() {
      v.pause();
      v.remove();
    },
    nudge() {
      if (v.paused) play();
    },
    probe: () => !v.paused,
  };
}

function comboKeepalive() {
  const scroll = fastScrollKeepalive();
  const video = videoKeepalive();
  return {
    stop() {
      scroll.stop();
      video.stop();
    },
    nudge: video.nudge,
    probe: scroll.probe,
  };
}

const STARTERS = { css: cssKeepalive, scroll: scrollKeepalive, fast: fastScrollKeepalive, video: videoKeepalive, combo: comboKeepalive };

// Returns { mode, stop(), nudge(), probe() } or null for an unknown mode.
export function startKeepalive(mode) {
  const start = STARTERS[mode];
  if (!start) return null;
  return { mode, nudge() {}, probe: () => true, ...start() };
}
