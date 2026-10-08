// Holds the active scene and runs fade-to-black transitions between scenes.
// A scene implements any of: enter(), exit(), update(dt), render(r, alpha), onInput(evt).
export class SceneManager {
  constructor(renderer, fadeTime) {
    this.renderer = renderer;
    this.fadeTime = fadeTime;
    this.current = null;
    this.pending = null;
    this.fade = 0; // 0 = none, >0 fading out, <0 fading in
  }

  set(scene) {
    this.current?.exit?.();
    this.current = scene;
    scene.enter?.();
  }

  // Fades to black, swaps scene, fades back in.
  transition(factory) {
    if (this.pending) return;
    this.pending = factory;
    this.fade = this.fadeTime;
  }

  get transitioning() {
    return this.pending !== null || this.fade < 0;
  }

  update(dt) {
    if (this.fade > 0) {
      this.fade -= dt;
      this.renderer.fadeAlpha = 1 - Math.max(0, this.fade) / this.fadeTime;
      if (this.fade <= 0) {
        this.set(this.pending());
        this.pending = null;
        this.fade = -this.fadeTime;
      }
    } else if (this.fade < 0) {
      this.fade += dt;
      this.renderer.fadeAlpha = Math.max(0, -this.fade / this.fadeTime);
      if (this.fade >= 0) {
        this.fade = 0;
        this.renderer.fadeAlpha = 0;
      }
    }
    this.current?.update?.(dt);
  }

  render(alpha) {
    this.current?.render?.(this.renderer, alpha);
  }

  input(evt) {
    if (this.pending) return;
    this.current?.onInput?.(evt);
  }
}
