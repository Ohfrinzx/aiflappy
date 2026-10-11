// Frame-time graph for diagnosing stutter on a real device (?perf).
// Each bar is one frame's gap; green <= 1/60 s, orange <= 1/40 s, red slower.
// Yellow ticks mark frames where you tapped. Screenshot it and share.
const N = 120;

export class PerfOverlay {
  constructor() {
    this.gaps = new Float32Array(N);
    this.taps = new Uint8Array(N);
    this.i = 0;
    this.tapPending = false;
    this.tapFrames = 0;
    this.tapHitches = 0;
    this.worst = 0;
  }

  tap() {
    this.tapPending = true;
  }

  record(dt) {
    const ms = dt * 1000;
    this.gaps[this.i] = ms;
    this.taps[this.i] = this.tapPending ? 1 : 0;
    if (this.tapPending) {
      this.tapFrames++;
      if (ms > 25) this.tapHitches++;
    }
    this.tapPending = false;
    this.worst = Math.max(this.worst * 0.995, ms);
    this.i = (this.i + 1) % N;
  }

  render(r) {
    const ctx = r.ctx;
    const s = r.pixelScale;
    const x0 = 8;
    const y0 = r.viewBottom - 50; // bottom of graph, in game coords
    ctx.setTransform(s, 0, 0, s, 0, r.offY * s);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#000';
    ctx.fillRect(x0 - 4, y0 - 44, N * 2 + 8, 62);
    ctx.globalAlpha = 1;
    let sum = 0;
    for (let k = 0; k < N; k++) {
      const idx = (this.i + k) % N;
      const ms = this.gaps[idx];
      sum += ms;
      ctx.fillStyle = ms <= 17.5 ? '#4caf50' : ms <= 25 ? '#ff9800' : '#f44336';
      const h = Math.min(40, ms);
      ctx.fillRect(x0 + k * 2, y0 - h, 2, h);
      if (this.taps[idx]) {
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(x0 + k * 2, y0 + 1, 2, 3);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(x0, y0 - 16.7, N * 2, 0.5); // 60 fps line
    const fps = sum > 0 ? (N * 1000) / sum : 0;
    ctx.fillStyle = '#fff';
    ctx.font = '7px monospace';
    ctx.fillText(`${fps.toFixed(0)} fps  worst ${this.worst.toFixed(0)}ms  tap hitches ${this.tapHitches}/${this.tapFrames}`, x0, y0 + 12);
  }
}
