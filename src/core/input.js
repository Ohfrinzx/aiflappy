// Unified input: touch, mouse/pen and keyboard become simple press / release
// events in game coordinates. Space, Up, W and Enter count as a "tap" anywhere;
// P / Escape pause; M mutes.
//
// Touch uses *passive* touchstart/touchend listeners. A non-passive touch
// listener (needed to call preventDefault) makes iOS Safari dispatch every
// touch synchronously and wait on the page, which can delay the next frame and
// shows up as a hitch on each tap. Zoom / scroll / double-tap are blocked with
// CSS `touch-action: none` instead.
const TAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'Enter', 'NumpadEnter']);

export class Input {
  constructor(renderer, target = window) {
    this.renderer = renderer;
    this.listeners = new Set();
    this.gestureFns = [];

    const canvas = renderer.canvas;
    const passive = { passive: true };
    this.lastTouch = -Infinity;

    // Touch (phones / tablets).
    canvas.addEventListener('touchstart', (e) => {
      this.lastTouch = performance.now();
      this.gesture();
      for (const t of e.changedTouches) this.pointer('press', t.clientX, t.clientY);
    }, passive);
    const touchEnd = (e) => {
      this.lastTouch = performance.now();
      this.gesture(); // iOS only unlocks audio on some gesture types; try both
      for (const t of e.changedTouches) this.pointer('release', t.clientX, t.clientY);
    };
    window.addEventListener('touchend', touchEnd, passive);
    window.addEventListener('touchcancel', () => this.dispatch({ type: 'release', source: 'pointer', x: -1, y: -1 }), passive);

    // Mouse / pen (touch-generated pointer events are ignored: handled above).
    const isTouchish = (e) => e.pointerType === 'touch' || performance.now() - this.lastTouch < 800;
    canvas.addEventListener('pointerdown', (e) => {
      if (isTouchish(e)) return;
      e.preventDefault();
      this.gesture();
      this.pointer('press', e.clientX, e.clientY);
    });
    window.addEventListener('pointerup', (e) => {
      if (isTouchish(e)) return;
      this.gesture();
      this.pointer('release', e.clientX, e.clientY);
    });
    window.addEventListener('pointercancel', (e) => {
      if (!isTouchish(e)) this.dispatch({ type: 'release', source: 'pointer', x: -1, y: -1 });
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    // Safari pinch-zoom (only fires for multi-finger gestures, never on taps).
    document.addEventListener('gesturestart', (e) => e.preventDefault());

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

  pointer(type, clientX, clientY) {
    const p = this.renderer.toGame(clientX, clientY);
    this.dispatch({ type, source: 'pointer', x: p.x, y: p.y });
  }

  subscribe(fn) {
    this.listeners.add(fn);
  }

  dispatch(evt) {
    for (const fn of this.listeners) fn(evt);
  }
}
