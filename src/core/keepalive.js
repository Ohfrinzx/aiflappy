// Display keepalives: experiments for the iOS per-tap hitch (see CLAUDE.md).
// With Safari's default "Prefer Page Rendering Updates near 60fps" flag, page
// frames come from a 60 Hz display link. Touching the screen boosts a ProMotion
// display to 120 Hz and back, which knocks that 60 Hz cadence out of step. Each
// mode tries to hold the display at 120 Hz from outside WebKit's page display
// link, so a touch has nothing to boost:
//   css    - a compositor (CSS) animation
//   scroll - an invisible overflow box kept smooth-scrolling; on iOS, WebKit
//            hands programmatic smooth scrolls to UIKit's own scroll animation
//   video  - a tiny muted 120 fps video loop
export const KEEPALIVE_MODES = ['css', 'scroll', 'video'];

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

const STARTERS = { css: cssKeepalive, scroll: scrollKeepalive, video: videoKeepalive };

// Returns { mode, stop(), nudge(), probe() } or null for an unknown mode.
export function startKeepalive(mode) {
  const start = STARTERS[mode];
  if (!start) return null;
  return { mode, nudge() {}, probe: () => true, ...start() };
}
