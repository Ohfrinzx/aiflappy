// Sound playback: uses real files when enabled & present, otherwise the synth.
// Sounds are pre-rendered to sample buffers and played through an always-on
// AudioWorklet mixer (see mixer.worklet.js), so a flap only posts a message.
// Falls back to buffer-source nodes where AudioWorklet isn't available.
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
    this.mixer = null; // AudioWorkletNode once ready
    this.inMixer = new Set(); // sound names loaded into the mixer
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
      // Build the mixer and render synth sounds off the tap that unlocked
      // audio; real files (if any) then override.
      window.setTimeout(async () => {
        await this.startMixer();
        await this.prerender();
        if (this.cfg.useFiles) await this.loadFiles();
      }, 250);
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  get mode() {
    return this.mixer ? 'worklet' : 'nodes';
  }

  async startMixer() {
    if (!this.ctx.audioWorklet || typeof window.AudioWorkletNode !== 'function') return;
    try {
      await this.ctx.audioWorklet.addModule(new URL('./mixer.worklet.js', import.meta.url));
      const node = new window.AudioWorkletNode(this.ctx, 'sfx-mixer', {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      node.connect(this.master);
      this.mixer = node;
      for (const [name, buf] of this.buffers) this.sendToMixer(name, buf);
    } catch {
      /* stay on buffer-source playback */
    }
  }

  setBuffer(name, buf) {
    this.buffers.set(name, buf);
    if (this.mixer) this.sendToMixer(name, buf);
  }

  sendToMixer(name, buf) {
    this.mixer.port.postMessage({ type: 'load', name, data: buf.getChannelData(0).slice() });
    this.inMixer.add(name);
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
        this.setBuffer(name, trim(this.ctx, buf));
        await new Promise((r) => window.setTimeout(r, 16)); // one sound per frame-ish
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
            this.setBuffer(name, buf);
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
    if (this.mixer && this.inMixer.has(name)) {
      this.mixer.port.postMessage({ type: 'play', name });
      return;
    }
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
