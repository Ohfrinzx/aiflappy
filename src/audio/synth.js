// Procedural sound effects (Web Audio). Each entry: (ctx, out, t) => void,
// scheduling nodes at time t into destination `out`. Add new sounds here.

// Deterministic white noise, so pre-rendered sounds are stable between loads.
function noiseBuffer(ctx) {
  if (ctx._noise) return ctx._noise;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let s = 12345;
  for (let i = 0; i < len; i++) {
    s = (s * 1664525 + 1013904223) >>> 0;
    d[i] = s / 2147483648 - 1;
  }
  ctx._noise = buf;
  return buf;
}

function env(ctx, t, attack, hold, release, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.setValueAtTime(peak, t + attack + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  return g;
}

function tone(ctx, out, t, { type = 'sine', f0, f1 = f0, dur, peak = 0.3, attack = 0.005, curve = 'exp' }) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) {
    if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    else o.frequency.linearRampToValueAtTime(f1, t + dur);
  }
  const g = env(ctx, t, attack, 0, dur, peak);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + attack + dur + 0.05);
}

function noise(ctx, out, t, { dur, type = 'bandpass', f0, f1 = f0, q = 1, peak = 0.4, attack = 0.005 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) filt.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = env(ctx, t, attack, 0, dur, peak);
  src.connect(filt).connect(g).connect(out);
  src.start(t, 0.25);
  src.stop(t + attack + dur + 0.05);
}

export const SYNTH = {
  wing(ctx, out, t) {
    noise(ctx, out, t, { dur: 0.09, f0: 900, f1: 2600, q: 1.2, peak: 0.5, attack: 0.01 });
    tone(ctx, out, t, { type: 'triangle', f0: 300, f1: 520, dur: 0.06, peak: 0.08 });
  },
  point(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', f0: 1318, dur: 0.07, peak: 0.12 });
    tone(ctx, out, t + 0.07, { type: 'square', f0: 1975, dur: 0.22, peak: 0.12 });
    tone(ctx, out, t + 0.07, { type: 'sine', f0: 3950, dur: 0.18, peak: 0.05 });
  },
  hit(ctx, out, t) {
    noise(ctx, out, t, { dur: 0.12, type: 'lowpass', f0: 2400, f1: 300, peak: 0.8 });
    tone(ctx, out, t, { type: 'square', f0: 180, f1: 50, dur: 0.12, peak: 0.25 });
  },
  die(ctx, out, t) {
    tone(ctx, out, t + 0.12, { type: 'triangle', f0: 880, f1: 160, dur: 0.5, peak: 0.25, attack: 0.02 });
  },
  swoosh(ctx, out, t) {
    noise(ctx, out, t, { dur: 0.32, f0: 400, f1: 3200, q: 0.8, peak: 0.35, attack: 0.08 });
  },
  warning(ctx, out, t) {
    for (let i = 0; i < 3; i++) {
      tone(ctx, out, t + i * 0.4, { type: 'square', f0: 880, f1: 440, dur: 0.3, peak: 0.1, curve: 'lin' });
    }
  },
  roar(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', f0: 220, f1: 70, dur: 0.6, peak: 0.18, attack: 0.04 });
    noise(ctx, out, t, { dur: 0.6, f0: 600, f1: 200, q: 2, peak: 0.3, attack: 0.04 });
  },
  shoot(ctx, out, t) {
    tone(ctx, out, t, { type: 'square', f0: 700, f1: 240, dur: 0.1, peak: 0.08 });
  },
  bossHit(ctx, out, t) {
    noise(ctx, out, t, { dur: 0.2, type: 'lowpass', f0: 3000, f1: 200, peak: 0.6 });
    tone(ctx, out, t, { type: 'square', f0: 120, f1: 40, dur: 0.25, peak: 0.2 });
  },
  orb(ctx, out, t) {
    tone(ctx, out, t, { type: 'sine', f0: 880, f1: 1760, dur: 0.15, peak: 0.15 });
    tone(ctx, out, t + 0.05, { type: 'triangle', f0: 1320, f1: 2640, dur: 0.15, peak: 0.1 });
  },
  charge(ctx, out, t) {
    tone(ctx, out, t, { type: 'sawtooth', f0: 100, f1: 600, dur: 0.7, peak: 0.08, curve: 'lin' });
  },
  explode(ctx, out, t) {
    noise(ctx, out, t, { dur: 0.9, type: 'lowpass', f0: 1800, f1: 80, peak: 0.9, attack: 0.01 });
    tone(ctx, out, t, { type: 'sine', f0: 90, f1: 30, dur: 0.8, peak: 0.4 });
  },
  victory(ctx, out, t) {
    [523, 659, 784, 1046].forEach((f, i) => {
      tone(ctx, out, t + i * 0.12, { type: 'square', f0: f, dur: i === 3 ? 0.5 : 0.12, peak: 0.1 });
    });
  },
};
