// Entry point: wires up engine services and starts on the title screen.
// URL flags (for testing): ?start=95 begins a run at score 95, ?god disables death,
// ?play skips the title screen.
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

function readParams() {
  const q = new URLSearchParams(location.search);
  return {
    start: Math.max(0, parseInt(q.get('start') ?? '0', 10) || 0),
    god: q.has('god'),
    play: q.has('play'),
  };
}

async function boot() {
  const canvas = document.getElementById('game');
  const storage = new Storage(CONFIG.storageKey);
  const renderer = new Renderer(canvas, CONFIG.width, CONFIG.height);
  const input = new Input(renderer);
  const audio = new Audio(CONFIG.assets, storage.get('muted', false));
  // Hi-res sprite copies on high-DPI screens (capped to bound memory).
  const hiScale = Math.min(4, Math.ceil(renderer.pixelScale));
  const sprites = await loadSprites(CONFIG.assets, hiScale);
  renderer.smooth = hiScale > 1;
  const scenes = new SceneManager(renderer, CONFIG.fx.fadeTime);
  const params = readParams();

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

  input.onGesture(() => audio.unlock());
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
    },
    render(alpha) {
      renderer.begin();
      scenes.render(alpha);
      renderer.end();
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
