// One run: Get Ready -> playing (pipes, bosses) -> dying -> game over / victory.
// Practice mode (`practice: bossId`) skips the pipes, starts at the boss, and
// ends with a tap-to-retry panel instead of recording the run.
import { CONFIG } from '../config.js';
import { weightedPick } from '../core/math.js';
import { Events } from '../core/events.js';
import { THEMES } from '../content/themes.js';
import { medalFor } from '../content/medals.js';
import { Bird } from '../entities/bird.js';
import { PipeField } from '../entities/pipes.js';
import { Ground } from '../entities/ground.js';
import { Particles } from '../entities/particles.js';
import { Hazards } from '../systems/hazards.js';
import { BossDirector } from '../systems/bossDirector.js';
import { Button } from '../ui/button.js';
import { drawNumber } from '../ui/numbers.js';
import { GameOverPanel } from '../ui/gameOver.js';
import { PracticePanel } from '../ui/practicePanel.js';
import { renderHitboxes } from '../ui/hitboxOverlay.js';

const THEME_FADE = 1.5; // seconds to crossfade the background between themes

export class PlayScene {
  constructor(game, { startScore = 0, practice = null, attempt = 1 } = {}) {
    this.game = game;
    const sp = game.sprites;
    this.events = new Events();
    this.practice = practice; // boss id in practice mode
    this.attempt = attempt;
    const enc = practice && (CONFIG.bosses.encounters.find((e) => e.id === practice) ?? { id: practice });
    this.theme = THEMES.find((t) => t.id === enc?.theme) ?? weightedPick(THEMES.filter((t) => t.weight > 0));
    this.startTheme = this.theme;
    this.prevTheme = null;
    this.themeFade = 0;
    this.skin = game.progress.skinForRun();
    this.bird = new Bird(sp, this.skin);
    this.pipes = new PipeField(sp, this.events);
    this.pipes.spawned = startScore; // debug: ?start=N skips ahead
    this.ground = new Ground(sp);
    this.particles = new Particles();
    this.hazards = new Hazards();
    this.bosses = new BossDirector(this, practice ? { encounters: [{ id: practice, at: 0 }], practice: true } : {});
    this.score = startScore;
    this.pipesPassed = 0; // real pipes passed this run (for unlock stats)
    this.reached = []; // boss ids fought this run
    this.flawless = []; // boss ids beaten without losing a life
    this.flaps = 0;
    this.livesLost = 0;
    this.livesLostAtFight = 0;
    this.state = 'ready'; // ready | playing | dying | over
    this.paused = false;
    this.readyAlpha = 1;
    this.deadT = 0;
    this.panel = null;
    this.victory = false;
    this.queuedTap = false; // taps are applied at the next simulation step
    this.lives = null; // player lives; only active during boss fights
    this.invulnT = 0;
    this.pauseButton = new Button(sp, 'button-pause', 10, 10, () => this.setPaused(true));
    this.resumeButton = new Button(sp, 'button-resume', 10, 10, () => this.setPaused(false));
    // Same pause button on Get Ready / Game Over: back to the title screen
    // (where the bird can be changed).
    this.menuButton = new Button(sp, 'button-pause', 10, 10, () => this.toTitle());
  }

  // ---- events ------------------------------------------------------------

  onInput(evt) {
    const g = this.game;
    if (evt.type === 'mute') return g.toggleMute();
    if (evt.type === 'pause') {
      if (this.state === 'playing') this.setPaused(!this.paused);
      else if (this.menuAvailable) this.toTitle();
      return;
    }

    switch (this.state) {
      case 'ready':
        if (this.menuButton.handle(evt)) return;
        if (evt.type === 'press') this.queuedTap = true;
        break;
      case 'playing':
        if (this.paused) {
          if (this.resumeButton.handle(evt)) return;
          if (evt.type === 'press' && evt.source === 'key') this.setPaused(false);
          return;
        }
        if (CONFIG.ui.showPauseButton && this.pauseButton.handle(evt)) return;
        if (evt.type === 'press') this.queuedTap = true;
        break;
      case 'over':
        if (this.menuButton.handle(evt)) return;
        this.panel?.onInput(evt);
        break;
    }
  }

  // Get Ready and Game Over are the "not playing" screens with a way back.
  get menuAvailable() {
    return this.state === 'ready' || this.state === 'over';
  }

  toTitle() {
    if (this.leaving) return;
    this.leaving = true;
    this.game.audio.play('swoosh');
    if (this.practice) this.game.toPractice();
    else this.game.toTitle();
  }

  // Crossfades the background (and ground) to another theme.
  setTheme(id) {
    const t = THEMES.find((x) => x.id === id);
    if (!t || t === this.theme) return;
    this.prevTheme = this.theme;
    this.theme = t;
    this.themeFade = 1;
  }

  onBlur() {
    if (this.state === 'playing') this.setPaused(true);
  }

  setPaused(p) {
    this.paused = p;
    this.queuedTap = false;
    this.pauseButton.pressed = false;
    this.resumeButton.pressed = false;
    this.game.audio.play('swoosh');
  }

  addScore(n) {
    this.score += n;
    this.game.audio.play('point');
  }

  // During a boss fight a hit costs a life instead of ending the run.
  loseLife(cause) {
    const g = this.game;
    this.lives--;
    this.livesLost++;
    this.invulnT = CONFIG.bosses.invulnTime;
    this.bird.blink = this.invulnT;
    if (cause === 'ground') this.bird.bounce();
    g.audio.play('hit');
    g.renderer.flash(0.15, 0.5);
    g.renderer.shake(0.3, 4);
  }

  die(cause) {
    if (this.game.params.god) {
      if (cause === 'ground') this.bird.vy = this.game.config.bird.flapVelocity; // bounce
      return;
    }
    if (this.lives > 1 && this.bosses.state === 'fight') {
      this.loseLife(cause);
      return;
    }
    const g = this.game;
    this.state = 'dying';
    this.deadT = 0;
    this.bird.blink = 0;
    this.bird.kill(cause === 'ground');
    this.pipes.moving = false;
    this.ground.moving = false;
    g.audio.play('hit');
    if (cause !== 'ground') g.audio.play('die');
    g.renderer.flash(CONFIG.fx.flashTime);
    g.renderer.shake(CONFIG.fx.shakeTime, CONFIG.fx.shakeAmount);
  }

  onBossStart(enc) {
    this.lives = CONFIG.bosses.playerLives;
    this.reached.push(enc.id);
    this.livesLostAtFight = this.livesLost;
  }

  onBossDefeated(enc, final) {
    this.lives = null; // back to one-hit for any pipes that follow
    this.invulnT = 0;
    this.bird.blink = 0;
    if (this.livesLost === this.livesLostAtFight) this.flawless.push(enc.id);
    if (final && (this.practice || CONFIG.bosses.afterDefeat === 'end')) {
      this.victory = true;
      this.state = 'dying'; // reuse the "wait, then show panel" path
      this.deadT = 0;
      this.bird.hover();
      this.game.audio.play('victory');
    } else {
      this.pipes.spawning = true;
      if (enc.then) this.setTheme(enc.then);
    }
  }

  finish() {
    const g = this.game;
    this.state = 'over';
    if (this.practice) {
      // Nothing is recorded; tap anywhere to fight the boss again.
      const boss = this.bosses.boss;
      this.panel = new PracticePanel(g, {
        bossId: this.practice,
        attempt: this.attempt,
        victory: this.victory,
        bossLives: boss ? boss.lives : 0,
        bossMaxLives: boss?.maxLives ?? 0,
        onRetry: () => g.practiceRun(this.practice, this.attempt + 1),
      });
      return;
    }
    const beaten = this.bosses.defeated;
    const { best, prevBest, newBirds } = g.progress.recordRun({
      score: this.score,
      pipes: this.pipesPassed,
      reached: this.reached,
      beaten,
      flawless: this.flawless,
      flaps: this.flaps,
      night: this.startTheme.id === 'night',
    });
    this.panel = new GameOverPanel(g, {
      score: this.score,
      best,
      newBirds,
      isNew: this.score > prevBest,
      medal: medalFor({ score: this.score, best, beaten }),
      victory: this.victory,
      onPlay: () => g.newRun(),
    });
  }

  // ---- simulation --------------------------------------------------------

  update(dt) {
    if (this.paused) return;
    const bird = this.bird;
    this.particles.update(dt);
    if (this.themeFade > 0) this.themeFade = Math.max(0, this.themeFade - dt / THEME_FADE);

    // Apply input inside the fixed step so interpolation stays consistent.
    const tap = this.queuedTap;
    this.queuedTap = false;
    if (tap && this.state === 'ready') {
      this.state = 'playing';
      bird.start();
      this.flaps++;
      this.game.audio.play('wing');
    } else if (tap && this.state === 'playing' && bird.flap()) {
      this.flaps++;
      this.game.audio.play('wing');
    }

    switch (this.state) {
      case 'ready':
        bird.update(dt);
        this.ground.update(dt);
        break;

      case 'playing': {
        this.readyAlpha = Math.max(0, this.readyAlpha - dt * 5);
        bird.update(dt);
        this.ground.update(dt);
        this.pipes.update(dt);
        this.bosses.update(dt);
        if (this.state !== 'playing') break; // boss defeat may end the run
        this.hazards.update(dt, this);
        const passed = this.pipes.collectPassed(bird);
        if (passed) {
          this.pipesPassed += passed;
          this.addScore(passed);
        }

        if (this.invulnT > 0) {
          this.invulnT -= dt;
          bird.blink = Math.max(0, this.invulnT);
          if (bird.hitsGround()) bird.bounce(); // can't lose a life while blinking
          break;
        }

        if (bird.hitsGround()) this.die('ground');
        else if (this.pipes.collides(bird)) this.die('pipe');
        else if (this.hazards.collides(bird)) this.die('hazard');
        else if (this.bosses.collides(bird)) this.die('boss');
        break;
      }

      case 'dying':
        this.deadT += dt;
        bird.update(dt);
        this.bosses.animate(dt);
        if (this.victory) this.ground.update(dt);
        if ((bird.grounded && this.deadT > 0.35) || this.deadT > (this.victory ? 1.2 : 1.6)) this.finish();
        break;

      case 'over':
        bird.update(dt);
        if (this.victory) this.ground.update(dt);
        this.panel.update(dt);
        break;
    }
  }

  // ---- drawing -----------------------------------------------------------

  render(r, alpha) {
    const sp = this.game.sprites;
    const L = CONFIG.layout;
    const W = CONFIG.width;
    const a = this.paused ? 1 : alpha;

    // Background, crossfading after a theme change (boss arenas).
    const fade = this.themeFade > 0 ? this.prevTheme : null;
    for (const [t, k] of fade ? [[fade, 1], [this.theme, 1 - this.themeFade]] : [[this.theme, 1]]) {
      r.draw(sp.get(t.file), 0, 0, k);
      r.fillTop(sp.edgeColor(t.file, 'top'), k);
    }
    this.pipes.render(r, a);
    this.bosses.render(r, a);
    this.hazards.render(r, a);
    const ground = (t) => t.ground ?? 'base';
    if (fade && ground(fade) !== ground(this.theme)) {
      this.ground.render(r, a, ground(fade));
      this.ground.render(r, a, ground(this.theme), 1 - this.themeFade);
    } else {
      this.ground.render(r, a, ground(this.theme));
    }
    this.bosses.renderFog(r, a);
    this.hazards.renderOverlay(r, a);
    this.bird.render(r, a);
    this.particles.render(r);
    if (this.game.params.hitboxes) renderHitboxes(r, this);

    // The combined drop-in 'message' image covers the score area, so hide it then.
    const hideScore = this.state === 'over' || (this.state === 'ready' && sp.has('message'));
    if (!hideScore) drawNumber(r, sp, this.score, W / 2, L.scoreY);

    if (this.readyAlpha > 0) {
      if (sp.has('message')) {
        r.drawCentered(sp.get('message'), W / 2, Math.round(CONFIG.height * 0.12), this.readyAlpha);
      } else {
        r.drawCentered(sp.get('text-getready'), W / 2, L.getReadyY, this.readyAlpha);
        r.drawCentered(sp.get('tutorial'), W / 2, L.tutorialY, this.readyAlpha);
      }
    }

    if (this.state !== 'over') this.bosses.renderHud(r); // keep the panel clear
    if (this.practice && this.state !== 'over') {
      r.drawCentered(sp.text(`PRACTICE  TRY ${this.attempt}`), W / 2, 16);
    }

    // Player lives (boss fights only), top-right.
    if (this.lives !== null && this.state === 'playing') {
      const full = sp.get('heart');
      for (let i = 0; i < CONFIG.bosses.playerLives; i++) {
        const img = i < this.lives ? full : sp.get('heart-empty');
        r.draw(img, W - 10 - (CONFIG.bosses.playerLives - i) * (full.width + 4), 12);
      }
    }

    if (this.state === 'playing' && CONFIG.ui.showPauseButton) {
      if (this.paused) {
        r.rect(0, r.viewTop, W, r.viewBottom - r.viewTop, '#000', 0.25);
        r.drawCentered(sp.get('text-paused'), W / 2, 200);
        this.resumeButton.render(r);
      } else {
        this.pauseButton.render(r);
      }
    } else if (this.paused) {
      r.drawCentered(sp.get('text-paused'), W / 2, 200);
    }

    this.panel?.render(r);
    if (this.menuAvailable) this.menuButton.render(r);
  }
}
