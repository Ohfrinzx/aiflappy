# aiflappy

Flappy Bird remake: plain JS ES modules + canvas, no build step, hosted on
GitHub Pages from `main`. See README.md for the architecture.

## Workflow rules (from the repo owner)

- **Auto-merge to `main`:** after making changes, test them, and if
  everything passes, merge into `main` and push. No need to ask first. Never
  merge changes that fail testing; report the failure instead.
- Testing before a merge means all of:
  1. `node tools/smoke-test.mjs` passes. It's a headless Chromium run of the
     title → play → game over flow, the full boss fight to victory, and the
     phone viewport plus touch input.
  2. A lint pass shows no unused or undefined identifiers.
  3. The changed feature has been looked at in screenshots (desktop and a
     phone-sized viewport such as 402×874 @3x).
- **Bump `src/version.js` with every merge to `main`** (MAJOR.MINOR.PATCH:
  minor for features, patch for fixes). The title screen shows it so the
  owner can confirm which build their phone is running.

## Notes

- Testing shortcuts: `?start=N` (begin at score N), `?god`, `?play`.
- `window.__game` exposes the running game for console / test automation.
- All tunables live in `src/config.js`; content lives in `src/content/`.
