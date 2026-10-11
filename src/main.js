// Entry point: wires up engine services and starts on the title screen.
// URL flags (for testing): ?start=95 begins a run at score 95, ?god disables death,
// ?play skips the title screen, ?perf shows a frame-time graph, ?nosound mutes.
import { CONFIG } from './config.js';
import { Loop } from './core/loop.js';
import { Renderer } from './core/renderer.js';
import { Input } from './core/input.js';
import { SceneManager } from './core/scenes.js';
import { Storage } from './core/storage.js';
import { Audio } from './audio/audio.js';
import { loadSprites } from './assets.js';
import { TitleScene } from './scenes/title.js';
import { PlayScene } from './scenes/play.js';
import { VERSION } from './version.js';
import { PerfOverlay } from './ui/perfOverlay.js';

// ?autoflap: keeps the bird hovering mid-screen with synthetic taps, so frame
// pacing can be measured with no touch events at all.
function autoFlap(scene, input) {
  const b = scene?.bird;
  if (!b) return;
  if (scene.state === 'ready' || (scene.state === 'playing' && b.y > 230 && b.vy > 0)) {
    input.dispatch({ type: 'press', source: 'auto', x: -1, y: -1 });
  }
}

function readParams() {
  const q = new URLSearchParams(location.search);
  const autoflap = q.has('autoflap');
  return {
    start: Math.max(0, parseInt(q.get('start') ?? '0', 10) || 0),
    god: q.has('god') || autoflap,
    play: q.has('play') || autoflap,
    perf: q.has('perf'), // frame-time graph for diagnosing stutter
    nosound: q.has('nosound'), // mute without saving the setting
    // Stutter diagnostics: ?input=pointer uses pointer events instead of touch
    // events; ?autoflap flaps automatically (no touches, implies ?god).
    input: q.get('input') === 'pointer' ? 'pointer' : 'touch',
    autoflap,
  };
}

async function boot() {
  const canvas = document.getElementById('game');
  const storage = new Storage(CONFIG.storageKey);
  const renderer = new Renderer(canvas, CONFIG.width, CONFIG.height);
  const params = readParams();
  const input = new Input(renderer, window, params.input);
  const audio = new Audio(CONFIG.assets, storage.get('muted', false));
  // Hi-res sprite copies on high-DPI screens (capped to bound memory).
  const hiScale = Math.min(4, Math.ceil(renderer.pixelScale));
  const sprites = await loadSprites(CONFIG.assets, hiScale);
  renderer.smooth = hiScale > 1;
  const scenes = new SceneManager(renderer, CONFIG.fx.fadeTime);

  const game = {
    config: CONFIG,
    renderer,
    input,
    audio,
    sprites,
    storage,
    scenes,
    params,
    version: VERSION,
    runCount: 0,
    newRun() {
      const startScore = game.runCount++ === 0 ? params.start : 0;
      scenes.transition(() => new PlayScene(game, { startScore }));
    },
    toggleMute() {
      audio.setMuted(!audio.muted);
      storage.set('muted', audio.muted);
    },
  };

  if (params.nosound) audio.muted = true;
  input.onGesture(() => audio.unlock());
  const perf = params.perf ? new PerfOverlay() : null;
  if (perf) input.subscribe((evt) => evt.type === 'press' && perf.tap());
  input.subscribe((evt) => scenes.input(evt));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) scenes.current?.onBlur?.();
  });

  if (params.play || params.start) {
    game.runCount = 1;
    scenes.set(new PlayScene(game, { startScore: params.start }));
  } else {
    scenes.set(new TitleScene(game));
  }

  new Loop({
    tickRate: CONFIG.tickRate,
    update(dt) {
      renderer.update(dt);
      scenes.update(dt);
      if (params.autoflap) autoFlap(scenes.current, input);
    },
    render(alpha, dt, work) {
      renderer.begin();
      scenes.render(alpha);
      renderer.end();
      if (perf) {
        perf.record(dt, work, input.handlerMs);
        input.handlerMs = 0;
        const mode = `input ${params.input}${params.autoflap ? ' (autoflap)' : ''}  audio ${audio.muted ? 'off' : audio.mode}`;
        perf.render(renderer, mode);
      }
    },
  }).start();

  window.__game = game; // handy for console tinkering
  console.info(`aiflappy v${VERSION}`);
}

boot();

// Keeps the game up to date (and playable offline); see sw.js.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
