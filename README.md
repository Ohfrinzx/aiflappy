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
- `?unlockall` makes every bird available for this visit (nothing is saved).
- `?perf` shows a frame-time graph at the bottom. Green bars are on time, red
  bars are slow frames, and yellow ticks mark your taps. The second line shows
  the slowest touch handler and game update+draw time over your last 10 taps,
  and whether sound runs through the `worklet` mixer or the `nodes` fallback.
- `?hitboxes` draws the collision shapes: pixel masks for the bird (cyan) and
  pipes/boss/feathers (red), pickups (green), and the ground line (yellow).
  On the live site, `hitboxes.html` is the same thing without the flag.
- `?nosound` mutes the game without saving the setting.
- `?autoflap` makes the bird flap by itself with no touches (implies `?god`).
  `?input=pointer` reads touches through pointer events instead of touch
  events, and `?input=none` ignores touches entirely. `?keepalive` runs a tiny
  invisible animation so the display never idles. `?fps=N` caps how many
  frames per second are drawn (10–120); physics run at the same speed. All of
  these are for diagnosing stutter with `?perf`.

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

## Characters

On the title screen, use the arrows (or Left/Right, A/D) to pick a bird. The
choice is saved. To get back to the title screen from **Get Ready** or **Game
Over**, tap the pause button (top-left) or press Esc / P. **Random** picks from the birds you've unlocked each run, like
the original. Locked birds show as silhouettes with their goal and your
progress. When a run unlocks a bird, the game over screen announces it. Every
bird has the same hitbox, so none of them changes the difficulty.

| Bird | How to unlock |
| --- | --- |
| Classic, Blue, Red | Available from the start |
| Lime | Score 10 in a run |
| Cool (sunglasses) | Score 20 in a run |
| Ghost | Play 25 runs |
| Penguin | Score 30 in a run |
| Silver | Score 40 in a run |
| Owl | Play 10 runs at night |
| Ninja | Pass 250 pipes in total |
| Bat | Score 50 in a run |
| Ice | Score 75 in a run |
| Robot | Pass 500 pipes in total |
| Pirate (eyepatch + bandana) | Flap 2000 times in total |
| Rainbow | Pass 1000 pipes in total |
| Gold | Reach King Crow |
| Royal (crown) | Beat King Crow |
| Phoenix | Beat King Crow 3 times |
| Angel (halo) | Beat King Crow without losing a life |

Progress is saved in the browser. Use `?unlockall` to try every bird without
unlocking them (nothing is saved).

## The boss: King Crow

After the 100th pipe, the pipes stop and a **WARNING** flashes. Then King Crow flies in.

- **How to damage it:** it spits golden orbs. Fly into one and the orb shoots
  back at the boss. Each hit is +1 score.
- **Boss lives:** King Crow has **4 lives**, shown as crowns under its health
  bar. Each life is a full 10 HP bar. When a bar empties it roars, clears the
  screen and refills, then starts again from phase 1.
- **Your lives:** you get **2 lives** during the fight, shown as hearts
  top-right. Any hit costs one, including touching the ground (which also
  bounces you back up), followed by 1.5 s of blinking invincibility. The pipes
  before the boss stay one-hit, like the original.
- **Damage per hit:** `damagePerHit` in `CONFIG.bosses.kingCrow`
  (`src/config.js`). Lives and HP are set right next to it.
- **Phase 1 (10–7 HP):** aimed feather volleys, wide feather fans, fast pipe
  walls, and a charge. A red lane shows the charge's line first.
- **Phase 2 (6–4 HP):** everything is faster and denser. Aimed shots lead your
  movement, pipe-wall gaps slide up and down, and feathers rain from the sky.
- **Phase 3 (3–1 HP, enraged and red):** back-to-back charges. It keeps
  shooting during pipe walls and feather rain.
- **Each phase change** bursts a ring of feathers in every direction. The
  notches on the health bar mark where the phases change.
- **Difficulty knobs:** every number is in `CONFIG.bosses.kingCrow`
  (`src/config.js`), with the old easier values in comments.
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

- **New bird:** add an entry to `src/content/birds.js`: a palette, a file
  prefix, and an optional style (wings, accessories, pattern) and unlock goal.
  New accessories and wing shapes go in `src/art/birds.js`.
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
