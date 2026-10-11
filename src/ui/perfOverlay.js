// Frame-time graph for diagnosing stutter on a real device (?perf).
// Each bar is one frame's gap: green = on time, orange = a bit late, red = a
// hitch (more than 1.5x the target frame time, i.e. > 25 ms at 60 fps).
// Yellow ticks mark frames where you tapped. Screenshot it and share.
const N = 120;

export class PerfOverlay {
  // capFps: the ?fps cap if any; thresholds scale with the target frame time.
  constructor(capFps = 0) {
    this.target = capFps ? 1000 / capFps : 1000 / 60;
    this.hitchMs = this.target * 1.5;
    this.gaps = new Float32Array(N);
    this.taps = new Uint8Array(N);
    this.i = 0;
    this.tapPending = false;
    this.tapFrames = 0;
    this.tapHitches = 0;
    this.worst = 0;
    // Recent samples (last 10 taps; the first tap is skipped because it
    // includes one-time audio startup).
    this.handlerRecent = [];
    this.workTapRecent = [];
    this.workOther = 0; // game work on non-tap frames (smoothed, ms)
    this.otherFrames = 0;
    this.otherHitches = 0;
    this.seenFirstTap = false;
  }

  tap() {
    this.tapPending = true;
  }

  // dt: frame gap (s); work: game update+draw time of the previous frame (ms);
  // handler: slowest touch handler since the last frame (ms).
  record(dt, work = 0, handler = 0) {
    const ms = dt * 1000;
    const push = (arr, v) => {
      arr.push(v);
      if (arr.length > 10) arr.shift();
    };
    if (this.tapPending) {
      if (this.seenFirstTap) {
        push(this.handlerRecent, handler);
        push(this.workTapRecent, work);
      }
      this.seenFirstTap = true;
    } else {
      this.workOther = this.workOther * 0.95 + work * 0.05;
    }
    this.gaps[this.i] = ms;
    this.taps[this.i] = this.tapPending ? 1 : 0;
    if (this.tapPending && this.handlerRecent.length) {
      this.tapFrames++;
      if (ms > this.hitchMs) this.tapHitches++;
    } else if (!this.tapPending && this.seenFirstTap) {
      this.otherFrames++;
      if (ms > this.hitchMs) this.otherHitches++;
    }
    this.tapPending = false;
    this.worst = Math.max(this.worst * 0.995, ms);
    this.i = (this.i + 1) % N;
  }

  render(r, modeLabel = '') {
    const ctx = r.ctx;
    const s = r.pixelScale;
    const x0 = 8;
    const y0 = r.viewBottom - 50; // bottom of graph, in game coords
    ctx.setTransform(s, 0, 0, s, 0, r.offY * s);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#000';
    ctx.fillRect(x0 - 4, y0 - 44, N * 2 + 24, 82);
    ctx.globalAlpha = 1;
    let sum = 0;
    let count = 0;
    for (let k = 0; k < N; k++) {
      const idx = (this.i + k) % N;
      const ms = this.gaps[idx];
      if (ms > 0) {
        sum += ms;
        count++;
      }
      ctx.fillStyle = ms <= this.target * 1.05 ? '#4caf50' : ms <= this.hitchMs ? '#ff9800' : '#f44336';
      const h = Math.max(0, Math.min(40, ms * (16.7 / this.target))); // on-time = line
      ctx.fillRect(x0 + k * 2, y0 - h, 2, h);
      if (this.taps[idx]) {
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(x0 + k * 2, y0 + 1, 2, 3);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0, y0 - 16.7, N * 2, 0.5); // target frame time line
    const fps = sum > 0 ? (count * 1000) / sum : 0;
    ctx.fillStyle = '#fff';
    ctx.font = '7px monospace';
    ctx.fillText(`${fps.toFixed(0)} fps  worst ${this.worst.toFixed(0)}ms  tap hitches ${this.tapHitches}/${this.tapFrames}`, x0, y0 + 12);
    const f = (v) => v.toFixed(1);
    const max = (a) => (a.length ? Math.max(...a) : 0);
    ctx.fillText(`touch ${f(max(this.handlerRecent))}ms  game ${f(max(this.workTapRecent))}/${f(this.workOther)}ms  other slow ${this.otherHitches}/${this.otherFrames}`, x0, y0 + 22);
    ctx.fillText(modeLabel, x0, y0 + 32);
  }
}
