// Sound playback: uses real files when enabled & present, otherwise the synth.
import { SYNTH } from './synth.js';

export class Audio {
  constructor(cfg, muted = false) {
    this.cfg = cfg;
    this.ctx = null;
    this.buffers = new Map();
    this.muted = muted;
    this.master = null;
  }

  // Must be called from a user gesture (browser autoplay rules).
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      if (this.cfg.useFiles) this.loadFiles();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  async loadFiles() {
    const names = Object.keys(SYNTH);
    await Promise.all(
      names.map(async (name) => {
        for (const ext of this.cfg.audioExtensions) {
          try {
            const res = await fetch(`${this.cfg.audioDir}${name}.${ext}`);
            if (!res.ok) continue;
            const buf = await this.ctx.decodeAudioData(await res.arrayBuffer());
            this.buffers.set(name, buf);
            return;
          } catch {
            /* try next extension */
          }
        }
      }),
    );
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.8;
  }

  play(name) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.001;
    const buf = this.buffers.get(name);
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.master);
      src.start(t);
    } else if (SYNTH[name]) {
      SYNTH[name](this.ctx, this.master, t);
    }
  }
}
