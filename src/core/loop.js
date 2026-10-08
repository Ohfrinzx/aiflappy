// Fixed-timestep loop: simulation runs at a constant rate regardless of the
// display refresh rate; rendering interpolates between the last two steps.
export class Loop {
  constructor({ tickRate, update, render }) {
    this.step = 1 / tickRate;
    this.update = update;
    this.render = render;
    this.acc = 0;
    this.last = 0;
    this.running = false;
    this.frame = this.frame.bind(this);
  }

  start() {
    this.running = true;
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  frame(now) {
    if (!this.running) return;
    // Clamp long gaps (tab switch, breakpoint) so the sim never spirals.
    const dt = Math.min((now - this.last) / 1000, 0.25);
    this.last = now;
    this.acc += dt;
    while (this.acc >= this.step) {
      this.update(this.step);
      this.acc -= this.step;
    }
    this.render(this.acc / this.step, dt);
    requestAnimationFrame(this.frame);
  }
}
