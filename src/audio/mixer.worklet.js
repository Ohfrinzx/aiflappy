// Always-running sound-effect mixer (AudioWorklet, audio thread).
// Sounds are loaded once as raw samples; playing one is a tiny message from
// the main thread instead of creating audio nodes on every tap, and the audio
// output never goes idle (iOS otherwise wakes the hardware per sound).
class SfxMixer extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sounds = new Map();
    this.voices = [];
    this.port.onmessage = (e) => {
      const m = e.data;
      if (m.type === 'load') this.sounds.set(m.name, m.data);
      else if (m.type === 'play') {
        const data = this.sounds.get(m.name);
        if (data) {
          if (this.voices.length >= 16) this.voices.shift();
          this.voices.push({ data, pos: 0 });
        }
      } else if (m.type === 'stop') this.voices = [];
    };
  }

  process(_inputs, outputs) {
    const out = outputs[0][0];
    out.fill(0);
    for (let v = this.voices.length - 1; v >= 0; v--) {
      const voice = this.voices[v];
      const { data } = voice;
      const n = Math.min(out.length, data.length - voice.pos);
      for (let i = 0; i < n; i++) out[i] += data[voice.pos + i];
      voice.pos += n;
      if (voice.pos >= data.length) this.voices.splice(v, 1);
    }
    for (let i = 0; i < out.length; i++) {
      const s = out[i];
      out[i] = s > 1 ? 1 : s < -1 ? -1 : s;
    }
    return true; // keep running so the audio device never sleeps
  }
}

registerProcessor('sfx-mixer', SfxMixer);
