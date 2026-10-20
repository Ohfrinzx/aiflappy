# aiflappy

A remake of the original Flappy Bird in plain JavaScript and HTML5 canvas. It
runs on desktop and mobile, has no build step and no dependencies, and adds
two boss fights: King Crow after pipe 100 and Phoenix Lord after pipe 150.
Each boss also has a practice mode with instant retries.

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
  `?start=149` skips King Crow and meets Phoenix Lord after one pipe.
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
| Ember | Reach Phoenix Lord |
| Magma | Beat Phoenix Lord |
| Blue Flame | Beat Phoenix Lord 3 times |
| Dragon (horns + bat wings) | Beat Phoenix Lord without losing a life |

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
  movement, pipe-wall gaps slide up and down, and a **feather storm** streams in
  at an angle from the top-right. The storm always leaves one safe gap that
  drifts up and down; stay in it. Fan waves always leave a hole the bird fits
  through.
- **Phase 3 (3–1 HP, enraged and red):** back-to-back charges. It keeps
  shooting during pipe walls, and the storm is faster with a narrower gap.
- **Each phase change** bursts a ring of feathers in every direction. The
  notches on the health bar mark where the phases change.
- **Difficulty knobs:** every number is in `CONFIG.bosses.kingCrow`
  (`src/config.js`), with the old easier values in comments.
- **Winning** brings the pipes back, now at sunset (the dusk theme), and the
  run carries on toward Phoenix Lord. If the run ends after King Crow you get
  the gold crown "champion" medal.

## The second boss: Phoenix Lord

After pipe 150 (50 pipes after King Crow; boss hits add score but don't count
as pipes), the sky turns to a volcano and Phoenix Lord arrives.

- **How to damage it:** it drops blue **frost orbs**. Fly into one and it
  shoots back at the boss. Each hit is +1 score.
- **Boss lives:** 4 health bars of 10 HP. When a bar empties it burns to ash,
  then is **reborn** with a full bar. You get 2 hearts, like King Crow.
It's the final boss and is tuned to be harder than King Crow.

- **Phase 1 (10–7 HP):** **flame beams**: a red lane follows your height
  (flickering), then locks (solid) and a beam of fire burns there. Get out
  of the lane once it locks. Two rounds back to back. **Flame dive**: same idea
  with the whole Phoenix. It tracks you, locks, dashes across the screen and
  leaves a fire trail at that height for a moment. Also **lava pillar** walls,
  **lobbed fireballs** that burst into a ring of embers (the gaps are wider
  than the bird by the time they reach you), and **homing wisps** (pink flames)
  that follow your height. Wisps stop steering just before they reach you, so
  move at the last moment.
- **Phase 2 (6–4 HP):** extra beam lanes erupt alongside the tracked one,
  dives come twice, pillar gaps sway and it throws embers between them, and an
  **ember spiral** always leaves one safe gap drifting up and down (stay in it).
- **Phase 3 (3–1 HP, blue flames):** three beam rounds with three lanes, a
  denser spiral, and **ash fog** on some attacks: only a circle around the
  bird stays clear. Beam and dive warnings always show through.
- Every attack can be dodged by moving up and down only. The smoke test checks
  the beam lanes, the beam and dive tracking, the ember rings and the spiral.
- **Difficulty knobs:** every number is in `CONFIG.bosses.phoenixLord`
  (`src/config.js`).
- **Winning** shows the Victory screen and the flame "inferno" medal. To keep
  the endless run going after the last boss instead, set
  `CONFIG.bosses.afterDefeat = 'continue'`.

## Practice mode

Open **`practice.html`** (on GitHub Pages:
`https://<username>.github.io/<repo>/practice.html`), or tap **PRACTICE** on the
title screen. Pick a boss and you start right at its intro, with no pipes.

- When you lose your last heart, the panel shows your try number and how many
  of the boss's health bars were left. **Tap anywhere to retry** from the boss
  intro with full health on both sides.
- Direct links skip the menu: `practice.html?boss=kingCrow` and
  `practice.html?boss=phoenixLord`.
- The pause button (or Esc) on Get Ready / the retry screen goes back to the
  practice menu.
- Practice runs don't count toward your best score, stats or unlocks.
- Testing flags still work, e.g. `practice.html?boss=phoenixLord&god`.

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
  ui/                  buttons, number drawing, game over / victory / practice panels
  scenes/              title, play and practice-menu scenes
```

### Adding content

- **New bird:** add an entry to `src/content/birds.js`: a palette, a file
  prefix, and an optional style (wings, accessories, pattern) and unlock goal.
  New accessories and wing shapes go in `src/art/birds.js`.
- **New background:** add an entry to `src/content/themes.js`. A boss can
  switch to it with `theme` (when its WARNING starts) or `then` (after it is
  beaten) on its `CONFIG.bosses.encounters` entry.
- **New medal:** add to `src/content/medals.js`. It's a test function on the run
  stats, checked top to bottom.
- **New boss:** subclass `Boss` (`src/entities/boss.js`). Write its behaviour as
  generator scripts (`yield 0.5` waits half a second, `yield () => cond` waits
  until cond is true). Register it in `src/content/bosses/index.js` (name,
  practice-card sprite, stat names), then schedule it in
  `CONFIG.bosses.encounters`, e.g. `{ at: 200, id: 'myBoss' }`. It shows up in
  practice mode automatically.
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
