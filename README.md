# aiflappy

A remake of the original Flappy Bird in plain JavaScript and HTML5 canvas. It
runs on desktop and mobile, has no build step and no dependencies, and adds a
boss fight after pipe 100.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Flap / start | Space, Up arrow, W, Enter, or click | Tap |
| Pause | P or Esc, or the pause button | Pause button (top-left) |
| Mute | M | — |

## Play locally

Needs [Node.js](https://nodejs.org) 18 or newer. There are no dependencies,
so `npm install` is optional.

```sh
npm run dev
```

Then open http://localhost:8080 (if that port is busy, it uses the next free
one). It also prints a `Network:` address: open that on your phone while it's on
the same Wi-Fi to test on a real device. Edits show up on refresh. Stop the
server with Ctrl+C.

Opening `index.html` directly as a file won't work: the browser blocks ES modules
on `file://`. Any static server works too (`npx serve .`, `python -m http.server`).

Testing shortcuts (URL flags):

- `?start=95` starts a run at score 95, so the boss arrives after 5 pipes.
- `?god` makes you invincible (you bounce off the ground).
- `?play` skips the title screen.

## Host on GitHub Pages

1. Push this repo to GitHub. It must be public on a free plan.
2. Go to **Settings → Pages → Build and deployment**, set **Source** to
   "Deploy from a branch", pick your branch and `/ (root)`, then save.
3. After a minute it's live at `https://<username>.github.io/<repo>/`.

The `.nojekyll` file stops GitHub from running the site through Jekyll.
Mobile tip: use "Add to Home Screen" to get fullscreen without the browser bars.

## What's included (matching the original)

- Title screen, then Get Ready with the tap tutorial, then play, then game over
- Day or night background and a yellow, blue or red bird, picked at random each run
- The bird bobbing while idle, a nose-up tilt after each flap and a nose-dive
  when falling. Its wings stop flapping during a steep dive.
- Crash: white flash, screen shake, hit and die sounds, then the bird drops to the ground
- Game over: the title drops in, the scoreboard slides up, the score counts up,
  then the medal (with sparkle) and the NEW badge for a new best
- Medals: bronze 10, silver 20, gold 30, platinum 40
- Best score saved in the browser (localStorage)
- Pixel-perfect collision against the sprite shapes

## The boss: King Crow

After the 100th pipe, the pipes stop and a **WARNING** flashes. Then King Crow flies in.

- **How to damage it:** it spits golden orbs. Fly into one and the orb shoots
  back at the boss. 6 hits wins, and each hit is +1 score.
- **Phase 1:** aimed feather volleys, feather fans, and fast "pipe walls".
- **Phase 2 (half health):** everything gets faster and denser. It adds a charge
  attack: a red lane shows its line first, then it dashes across the screen.
- **Winning** shows a Victory screen and the gold crown "champion" medal. To keep
  the endless run going after the win instead, set
  `CONFIG.bosses.afterDefeat = 'continue'` in `src/config.js`.

## Using the original art & sounds

By default every sprite and sound is generated in code, so the repo has no
copyrighted assets. To get the exact original look, set
`CONFIG.assets.useFiles = true` and drop files into `assets/` (see
[assets/README.md](assets/README.md)). Files left out fall back to the
built-in versions. **Note:** a public GitHub Pages repo publishes whatever you
put in `assets/`.

## Project layout

```
src/
  config.js            all tunables: physics, layout, timings, boss schedule, asset mode
  main.js              boot: wires services together, starts the loop
  assets.js            sprite registry (procedural + file overrides, collision masks)
  core/                engine: fixed-step loop, renderer, input, scenes, storage, collision
  art/                 procedural pixel art (bird, world, UI, boss, bitmap font)
  audio/               Web Audio synth sounds + file playback
  content/             data-driven content: birds, themes, medals, bosses
  entities/            bird, pipes, ground, particles, projectiles, boss base class
  systems/             boss director (when bosses appear), hazards container
  ui/                  buttons, number drawing, game over / victory panel
  scenes/              title and play scenes
```

### Adding content

- **New bird skin:** add an entry to `src/content/birds.js` (palette + file prefix).
- **New background:** add an entry to `src/content/themes.js`.
- **New medal:** add to `src/content/medals.js`. It's a test function on the run
  stats, checked top to bottom.
- **New boss:** subclass `Boss` (`src/entities/boss.js`). Write its behaviour as
  generator scripts (`yield 0.5` waits half a second, `yield () => cond` waits
  until cond is true). Register it in `src/content/bosses/index.js`, then
  schedule it in `CONFIG.bosses.encounters`, e.g.
  `{ at: 200, id: 'myBoss' }`.
- **New sound:** add a function to `SYNTH` in `src/audio/synth.js`, then call
  `game.audio.play('name')`.
- **New screen/mode:** write a scene class (`update`, `render`, `onInput`) and
  switch to it with `game.scenes.transition(() => new MyScene(game))`.

## Physics source

The motion constants start from the classic 30 fps values in
[FlapPyBird](https://github.com/sourabhv/FlapPyBird) (MIT): flap −9, gravity +1,
max fall 10 px/frame, 4 px/frame scroll, 100 px gap. They're converted to
per-second units for a fixed 120 Hz simulation, which matches ProMotion
displays. Rendering is interpolated, so it stays smooth at 60 Hz too.
Everything is adjustable in `src/config.js`.

## Display

- On phones taller than 9:16, the view grows to fill the screen with no
  letterbox bars. The extra sky goes above (always clearing the notch / Dynamic
  Island) and the extra ground goes below. The playfield itself stays the
  original 288×512, so gameplay is identical on every screen.
- On high-DPI screens, sprites are drawn from 4× copies with smoothing. Every
  art pixel comes out the same size at any scale, and rotated sprites get
  clean edges.
- Sounds are pre-rendered to audio buffers on the first tap, so each sound
  effect is a single, cheap playback.
- A service worker (`sw.js`) checks for new files on every launch, so a fresh
  deploy shows up on the next open instead of after GitHub Pages' 10-minute
  cache. It also keeps a copy for offline play.
- Home-screen app on iPhone: iOS reads the status-bar setting when the icon is
  added. If you added it before the edge-to-edge update, delete the icon and
  add it again to draw under the status bar.
