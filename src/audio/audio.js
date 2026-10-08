// Sound playback: uses real files when enabled & present, otherwise the synth.
import { SYNTH } from './synth.js';

// Drops trailing silence from a rendered buffer.
function trim(ctx, buf) {
  const d = buf.getChannelData(0);
  let end = d.length;
  while (end > 1 && Math.abs(d[end - 1]) < 1e-4) end--;
  const out = ctx.createBuffer(1, end, buf.sampleRate);
  out.copyToChannel(d.subarray(0, end), 0);
  return out;
}

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
      // Render synth sounds to buffers once; real files (if any) then override.
      this.prerender().then(() => this.cfg.useFiles && this.loadFiles());
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  // Pre-renders each synth sound offline so playing one is a single
  // buffer-source node (building node graphs per tap can hitch on mobile).
  async prerender() {
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!OAC) return;
    const rate = this.ctx.sampleRate;
    for (const [name, fn] of Object.entries(SYNTH)) {
      if (this.buffers.has(name)) continue;
      try {
        const off = new OAC(1, Math.ceil(rate * 1.6), rate);
        fn(off, off.destination, 0);
        const buf = await off.startRendering();
        this.buffers.set(name, trim(this.ctx, buf));
      } catch {
        /* keep live synthesis for this sound */
      }
    }
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
    const t = this.ctx.currentTime;
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
