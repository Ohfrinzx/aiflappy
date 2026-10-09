// Decides when bosses appear: after `at` regular pipes have spawned, stops the
// pipe spawner, waits for the screen to clear, flashes WARNING, runs the fight.
import { CONFIG } from '../config.js';
import { BOSSES } from '../content/bosses/index.js';

export class BossDirector {
  constructor(scene) {
    this.scene = scene;
    this.encounters = [...CONFIG.bosses.encounters].sort((a, b) => a.at - b.at);
    this.idx = 0;
    this.state = 'idle';
    this.boss = null;
    this.warnT = 0;
    this.defeatedCount = 0;
    this.syncLimit();
  }

  get encounter() {
    return this.encounters[this.idx];
  }

  get active() {
    return this.state !== 'idle';
  }

  // Skip encounters already behind us (e.g. debug start score), cap spawner.
  syncLimit() {
    const pipes = this.scene.pipes;
    while (this.encounter && this.encounter.at <= pipes.spawned) this.idx++;
    pipes.spawnLimit = this.encounter ? this.encounter.at : Infinity;
  }

  update(dt) {
    const s = this.scene;
    switch (this.state) {
      case 'idle':
        if (this.encounter && s.pipes.spawned >= this.encounter.at) this.state = 'clearing';
        break;
      case 'clearing':
        if (!s.pipes.list.length) {
          this.state = 'warning';
          this.warnT = 2.2;
          s.game.audio.play('warning');
        }
        break;
      case 'warning':
        this.warnT -= dt;
        if (this.warnT <= 0) {
          const Ctor = BOSSES[this.encounter.id];
          if (!Ctor) throw new Error(`Unknown boss id: ${this.encounter.id}`);
          this.boss = new Ctor(s);
          this.state = 'fight';
        }
        break;
      case 'fight':
        this.boss.update(dt);
        for (const orb of s.hazards.touching(s.bird)) this.boss.absorb(orb);
        if (this.boss.finished) {
          const enc = this.encounter;
          this.boss = null;
          this.state = 'idle';
          this.defeatedCount++;
          this.idx++;
          this.syncLimit();
          s.onBossDefeated(enc);
        }
        break;
    }
  }

  animate(dt) {
    this.boss?.animate(dt);
  }

  collides(bird) {
    return this.boss ? this.boss.collides(bird) : false;
  }

  render(r, alpha) {
    this.boss?.render(r, alpha);
  }

  renderHud(r) {
    const sp = this.scene.game.sprites;
    if (this.state === 'warning' && Math.floor(this.warnT * 4) % 2 === 0) {
      r.drawCentered(sp.get('text-warning'), CONFIG.width / 2, 200);
    }
    const b = this.boss;
    if (b && !b.defeated) {
      const frame = sp.get('hpbar');
      const x = Math.round((CONFIG.width - frame.width) / 2);
      const y = 96;
      r.draw(frame, x, y);
      const inner = frame.width - 4;
      const w = Math.round((inner * b.hp) / b.maxHp);
      r.rect(x + 2, y + 2, w, frame.height - 4, '#f83800');
      r.rect(x + 2, y + 2, w, 2, '#ff9a6a');
      // Phase thresholds as notches.
      for (const m of b.hpMarks ?? []) {
        r.rect(x + 2 + Math.round((inner * m) / b.maxHp) - 1, y + 2, 2, frame.height - 4, '#3a2530');
      }
      // Remaining boss lives (health bars) as crowns under the bar.
      if (b.maxLives > 1) {
        const pip = sp.get('lifepip');
        const total = b.maxLives * (pip.width + 4) - 4;
        let px = Math.round((CONFIG.width - total) / 2);
        for (let i = 0; i < b.maxLives; i++) {
          r.draw(i < b.lives ? pip : sp.get('lifepip-empty'), px, y + frame.height + 4);
          px += pip.width + 4;
        }
      }
    }
  }
}
