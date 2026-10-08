# Drop-in assets

Every sprite and sound is generated in code by default. To replace any of them
with a real file:

1. Set `useFiles: true` under `assets` in `src/config.js`.
2. Put PNGs in `assets/sprites/` and sounds in `assets/audio/`. Use the exact
   names below.

Any file you leave out keeps its built-in version. Draw images at **game
scale**, where the screen is 288×512. The sizes listed are the built-in sizes.
Your files can differ slightly, because layout and collision read the image
size and alpha.

Names marked ★ match the widely used FlapPyBird asset pack, so those files
drop straight in.

> A public GitHub Pages site serves everything in this folder. Only commit files
> you're allowed to publish.

## Sprites (`assets/sprites/<name>.png`)

| Name | Size | What |
| --- | --- | --- |
| ★ `background-day`, ★ `background-night` | 288×512 | Backgrounds |
| ★ `base` | 336×112 | Scrolling ground (must be at least 288 wide; the extra width is how far it scrolls before wrapping) |
| ★ `pipe-green` | 52×320 | Pipe with the cap at the **top**. The upper pipe is drawn flipped. |
| ★ `yellowbird-upflap` / `-midflap` / `-downflap` | 34×24 | Bird frames (same for `bluebird-*`, `redbird-*`) |
| ★ `0` … `9` | 24×36 | Big score digits |
| ★ `gameover` | 192×42 | "Game Over" title |
| ★ `message` | 184×267 | *Optional.* If present, replaces the Get Ready text + tutorial with this one combined image |
| `text-getready` | ~198×39 | "Get Ready!" title |
| `tutorial` | 114×98 | Tap tutorial graphic |
| `logo` | ~192×39 | Title-screen logo |
| `text-victory`, `text-warning`, `text-paused` | — | Boss / pause titles |
| `small-0` … `small-9` | ~16×18 | Scoreboard digits |
| `scoreboard` | 226×114 | Game over panel (labels included) |
| `medal-bronze`, `medal-silver`, `medal-gold`, `medal-platinum`, `medal-champion` | 44×44 | Medals |
| `new` | 36×14 | NEW best badge |
| `sparkle-0` … `sparkle-2` | 10×10 | Medal sparkle frames |
| `button-play` | 104×58 | Play button |
| `button-pause`, `button-resume` | 26×28 | Pause / resume buttons |
| `kingcrow-0` … `kingcrow-3` | 96×80 | Boss: wing up / down, then wing up / down with beak open |
| `kingcrow-hurt-0` … `-3` | 96×80 | Boss hit-flash frames |
| `feather` | 22×10 | Boss projectile (points left) |
| `orb-0` … `orb-3` | 22×22 | Golden orb frames |
| `hpbar` | 124×12 | Boss health bar frame |

## Sounds (`assets/audio/<name>.ogg|.wav|.mp3`)

The game tries `.ogg`, then `.wav`, then `.mp3`.

| Name | When |
| --- | --- |
| ★ `wing` | Flap |
| ★ `point` | Score |
| ★ `hit` | Crash |
| ★ `die` | Falling after hitting a pipe |
| ★ `swoosh` | Menu transitions / panels |
| `warning`, `roar`, `shoot`, `bossHit`, `orb`, `charge`, `explode`, `victory` | Boss fight |
