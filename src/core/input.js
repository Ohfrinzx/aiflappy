// Unified input: pointer (mouse + touch + pen) and keyboard become simple
// press / release events in game coordinates. Space, Up, W and Enter count as a
// "tap" anywhere; P / Escape pause; M mutes.
const TAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter', 'NumpadEnter']);

export class Input {
  constructor(renderer, target = window) {
    this.renderer = renderer;
    this.listeners = new Set();
    this.gestureFns = [];

    const canvas = renderer.canvas;
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.gesture();
      const p = renderer.toGame(e.clientX, e.clientY);
      this.dispatch({ type: 'press', source: 'pointer', x: p.x, y: p.y });
    });
    window.addEventListener('pointerup', (e) => {
      this.gesture(); // iOS only unlocks audio on some gesture types; try both
      const p = renderer.toGame(e.clientX, e.clientY);
      this.dispatch({ type: 'release', source: 'pointer', x: p.x, y: p.y });
    });
    window.addEventListener('pointercancel', () => {
      this.dispatch({ type: 'release', source: 'pointer', x: -1, y: -1 });
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Stop iOS double-tap zoom / scroll bounce.
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

    target.addEventListener('keydown', (e) => {
      if (TAP_KEYS.has(e.code)) {
        e.preventDefault();
        if (e.repeat) return;
        this.gesture();
        this.dispatch({ type: 'press', source: 'key', x: -1, y: -1, code: e.code });
      } else if (e.code === 'KeyP' || e.code === 'Escape') {
        if (!e.repeat) this.dispatch({ type: 'pause', source: 'key' });
      } else if (e.code === 'KeyM') {
        if (!e.repeat) this.dispatch({ type: 'mute', source: 'key' });
      }
    });
    target.addEventListener('keyup', (e) => {
      if (TAP_KEYS.has(e.code)) {
        this.dispatch({ type: 'release', source: 'key', x: -1, y: -1, code: e.code });
      }
    });
  }

  // Browsers only allow audio after a user gesture; fn runs on every gesture
  // and should be cheap / idempotent.
  onGesture(fn) {
    this.gestureFns.push(fn);
  }

  gesture() {
    this.gestureFns.forEach((fn) => fn());
  }

  subscribe(fn) {
    this.listeners.add(fn);
  }

  dispatch(evt) {
    for (const fn of this.listeners) fn(evt);
  }
}
