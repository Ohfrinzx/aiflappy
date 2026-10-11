// Fixed-timestep loop: simulation runs at a constant rate regardless of the
// display refresh rate; rendering interpolates between the last two steps.
// maxFps (optional, ?fps=N test mode) caps how often frames are drawn.
export class Loop {
  constructor({ tickRate, update, render, maxFps = 0 }) {
    this.step = 1 / tickRate;
    this.interval = maxFps > 0 ? 1000 / maxFps : 0; // ms between drawn frames
    this.nextDue = 0;
    this.update = update;
    this.render = render;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.work = 0;
    this.frame = this.frame.bind(this);
  }

  start() {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  frame(now) {
    if (!this.running) return;
    if (this.interval) {
      // Frame cap: skip this display refresh until the next frame is due.
      // Keeps the long-run average at maxFps even when it doesn't divide the
      // refresh rate (which is exactly what causes uneven pacing).
      if (now < this.nextDue - 1) {
        requestAnimationFrame(this.frame);
        return;
      }
      this.nextDue = Math.max(this.nextDue + this.interval, now);
    }
    // Clamp long gaps (tab switch, breakpoint) so the sim never spirals; the
    // first rAF timestamp can precede start(), so never go negative either.
    const dt = Math.min(Math.max(0, (now - this.last) / 1000), 0.25);
    this.last = now;
    this.acc += dt;
    const t0 = performance.now();
    while (this.acc >= this.step) {
      this.update(this.step);
      this.acc -= this.step;
    }
    this.render(this.acc / this.step, dt, this.work);
    this.work = performance.now() - t0; // game work last frame (for ?perf)
    requestAnimationFrame(this.frame);
  }
}
