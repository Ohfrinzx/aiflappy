// One run: Get Ready -> playing (pipes, bosses) -> dying -> game over / victory.
import { CONFIG } from '../config.js';
import { weightedPick } from '../core/math.js';
import { Events } from '../core/events.js';
import { THEMES } from '../content/themes.js';
import { BIRDS } from '../content/birds.js';
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

export class PlayScene {
  constructor(game, { startScore = 0 } = {}) {
    this.game = game;
    const sp = game.sprites;
    this.events = new Events();
    this.theme = weightedPick(THEMES);
    this.skin = weightedPick(BIRDS);
    this.bird = new Bird(sp, this.skin);
    this.pipes = new PipeField(sp, this.events);
    this.pipes.spawned = startScore; // debug: ?start=N skips ahead
    this.ground = new Ground(sp);
    this.particles = new Particles();
    this.hazards = new Hazards();
    this.bosses = new BossDirector(this);
    this.score = startScore;
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
  }

  // ---- events ------------------------------------------------------------

  onInput(evt) {
    const g = this.game;
    if (evt.type === 'mute') return g.toggleMute();
    if (evt.type === 'pause') {
      if (this.state === 'playing') this.setPaused(!this.paused);
      return;
    }

    switch (this.state) {
      case 'ready':
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
        this.panel?.onInput(evt);
        break;
    }
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

  onBossDefeated() {
    this.lives = null; // back to one-hit for any pipes that follow
    this.invulnT = 0;
    this.bird.blink = 0;
    if (CONFIG.bosses.afterDefeat === 'end') {
      this.victory = true;
      this.state = 'dying'; // reuse the "wait, then show panel" path
      this.deadT = 0;
      this.bird.hover();
      this.game.audio.play('victory');
    } else {
      this.pipes.spawning = true;
    }
  }

  finish() {
    const g = this.game;
    const prevBest = g.storage.get('best', 0);
    const best = Math.max(prevBest, this.score);
    if (best > prevBest) g.storage.set('best', best);
    const stats = g.storage.get('stats', { runs: 0, bossesDefeated: 0 });
    stats.runs++;
    stats.bossesDefeated += this.bosses.defeatedCount;
    g.storage.set('stats', stats);
    this.state = 'over';
    this.panel = new GameOverPanel(g, {
      score: this.score,
      best,
      isNew: this.score > prevBest,
      medal: medalFor({ score: this.score, best, bossesDefeated: this.bosses.defeatedCount }),
      victory: this.victory,
      onPlay: () => g.newRun(),
    });
  }

  // ---- simulation --------------------------------------------------------

  update(dt) {
    if (this.paused) return;
    const bird = this.bird;
    this.particles.update(dt);

    // Apply input inside the fixed step so interpolation stays consistent.
    const tap = this.queuedTap;
    this.queuedTap = false;
    if (tap && this.state === 'ready') {
      this.state = 'playing';
      bird.start();
      this.game.audio.play('wing');
    } else if (tap && this.state === 'playing' && bird.flap()) {
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
        if (passed) this.addScore(passed);

        if (this.bosses.state === 'fight' && this.lives === null) this.lives = CONFIG.bosses.playerLives;
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

    r.draw(sp.get(this.theme.file), 0, 0);
    r.fillTop(sp.edgeColor(this.theme.file, 'top'));
    this.pipes.render(r, a);
    this.bosses.render(r, a);
    this.hazards.render(r, a);
    this.ground.render(r, a);
    this.bird.render(r, a);
    this.particles.render(r);

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
  }
}
