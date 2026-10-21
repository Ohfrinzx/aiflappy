# aiflappy

Flappy Bird remake: plain JS ES modules + canvas, no build step, hosted on
GitHub Pages from `main`. See README.md for the architecture.

## Workflow rules (from the repo owner)

- **Auto-merge to `main`:** after making changes, test them, and if
  everything passes, merge into `main` and push. No need to ask first. Never
  merge changes that fail testing; report the failure instead.
- Testing before a merge means all of:
  1. `npm test` (`node tools/smoke-test.mjs`) passes. It's a headless Chromium run of the
     title → play → game over flow, the full boss fight to victory, and the
     phone viewport plus touch input.
  2. A lint pass shows no unused or undefined identifiers.
  3. The changed feature has been looked at in screenshots (desktop and a
     phone-sized viewport such as 402×874 @3x).
- **Bump `src/version.js` with every merge to `main`** (MAJOR.MINOR.PATCH:
  minor for features, patch for fixes). The title screen shows it so the
  owner can confirm which build their phone is running.

## Notes

- Local server: `npm run dev` (zero-dependency, `tools/dev.mjs`); keep
  `package.json` `version` in sync with `src/version.js`.

- Testing shortcuts: `?start=N` (begin at score N), `?god`, `?play`,
  `?perf` (frame-time graph), `?nosound`, `?autoflap` (no-touch flapping),
  `?input=pointer|none`, `?keepalive[=css|scroll|video]`, `?fps=N` (stutter
  diagnostics). In the home-screen app, tapping the version number on the
  title screen cycles saved test modes (perf graph + each keepalive).
- `?hitboxes` (or `hitboxes.html`) draws the real collision shapes.
- Known iOS issue: Safari's default "Prefer Page Rendering Updates near
  60fps" flag causes a hitch on every touch on ProMotion iPhones (touch boost
  re-phases the 60 fps cadence). Turning the flag off fixes it. Already ruled
  out on device: input changes, frame caps, the css keepalive. WebKit source
  (`RemoteLayerTreeDrawingAreaProxyIOS.mm`): with the flag on, page frames come
  from a CADisplayLink at 60 fps, and the only high-frame-rate path needs the
  flag off or the off-by-default "Threaded Time-based Animations at High Frame
  Rate" setting, so rAF can't go above 60. Untested candidates (v1.10.1) hold
  the display at 120 Hz from outside that display link: `scroll` (programmatic
  smooth scroll runs as UIKit's `setContentOffset:animated:`) and `video`
  (120 fps loop). The system-wide setting Accessibility → Motion → Limit Frame
  Rate should also prevent the boost.
- Touch input must stay on *passive* listeners (see `src/core/input.js`);
  non-passive touch handlers caused per-tap hitches on iOS. Pointer listeners
  are only registered when a mouse/pen exists.
- Sound effects play through an always-on AudioWorklet mixer
  (`src/audio/mixer.worklet.js`); don't create audio nodes per sound on the
  hot path.
- `window.__game` exposes the running game for console / test automation.
- All tunables live in `src/config.js`; content lives in `src/content/`.
- Characters: `src/content/birds.js` (unlock goals), progress / unlocks /
  chosen bird in `src/systems/progress.js`. Bird collision always uses the
  plain `bird-hitbox-*` frames so skins never change difficulty.
- `?unlockall` makes all birds available (not saved).
- Bosses: King Crow (pipe 100, then pipes resume at dusk) and Phoenix Lord
  (pipe 150, volcano, last boss). Schedule + themes in
  `CONFIG.bosses.encounters`; registry (name, stats keys) in
  `src/content/bosses/index.js`. Per-boss stats feed bird unlocks.
- Practice mode: `practice.html` (menu) or `?boss=<id>`; tap-to-retry panel,
  records nothing. `?start=149` jumps to Phoenix Lord in a normal run.
- Boss attacks must be dodgeable by vertical movement only (the bird's x is
  fixed): no straight-down projectiles through the bird's column; patterns
  must leave a bird-sized gap. The smoke test checks the fan and storm, and
  Phoenix Lord's beam lanes, beam/dive tracking, ember rings and spiral.
- Phoenix Lord must stay harder than King Crow (owner feedback, v1.10.0):
  tracked beams and dives, 5+ attacks from phase 1.
