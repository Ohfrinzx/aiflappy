// Long-term player progress: stats across runs, unlocked birds, chosen bird.
// Stored in localStorage via Storage (keys: best, stats, unlocked, bird).
import { BIRDS, birdById } from '../content/birds.js';
import { BOSSES } from '../content/bosses/index.js';
import { pick } from '../core/math.js';

// Per-boss counters (bossReached / bossesDefeated / flawlessWins are King Crow's).
const BOSS_STATS = Object.values(BOSSES).flatMap((b) => Object.values(b.stats));

export class Progress {
  constructor(storage, { unlockAll = false } = {}) {
    this.storage = storage;
    this.unlockAll = unlockAll;
    this.unlocked = new Set(storage.get('unlocked', []));
    // Silently grant anything already earned (e.g. stats from before unlocks existed).
    this.checkUnlocks();
  }

  get stats() {
    const s = this.storage.get('stats', {});
    const out = {
      best: this.storage.get('best', 0),
      runs: s.runs ?? 0,
      totalPipes: s.totalPipes ?? 0,
      flaps: s.flaps ?? 0,
      nightRuns: s.nightRuns ?? 0,
    };
    for (const k of BOSS_STATS) out[k] = s[k] ?? 0;
    return out;
  }

  isUnlocked(bird) {
    return !bird.unlock || this.unlockAll || this.unlocked.has(bird.id);
  }

  unlockedBirds() {
    return BIRDS.filter((b) => this.isUnlocked(b));
  }

  // "PASS 250 PIPES (120/250)" style text for a locked bird.
  goalText(bird) {
    const u = bird.unlock;
    if (!u) return '';
    const have = Math.min(this.stats[u.stat], u.at);
    return u.at > 1 && u.stat !== 'best' ? `${u.label} ${have}/${u.at}` : u.label;
  }

  // Grants every bird whose goal is met; returns the newly unlocked ones.
  checkUnlocks() {
    const s = this.stats;
    const fresh = BIRDS.filter((b) => b.unlock && !this.unlocked.has(b.id) && s[b.unlock.stat] >= b.unlock.at);
    if (fresh.length) {
      fresh.forEach((b) => this.unlocked.add(b.id));
      this.storage.set('unlocked', [...this.unlocked]);
    }
    return fresh;
  }

  // Records a finished run; returns { best, prevBest, newBirds }.
  // reached / beaten / flawless are lists of boss ids (see content/bosses).
  recordRun({ score, pipes, reached = [], beaten = [], flawless = [], flaps = 0, night = false }) {
    const prevBest = this.storage.get('best', 0);
    const best = Math.max(prevBest, score);
    if (best > prevBest) this.storage.set('best', best);
    const s = this.storage.get('stats', {});
    s.runs = (s.runs ?? 0) + 1;
    s.totalPipes = (s.totalPipes ?? 0) + pipes;
    s.flaps = (s.flaps ?? 0) + flaps;
    s.nightRuns = (s.nightRuns ?? 0) + (night ? 1 : 0);
    const bump = (ids, kind) => ids.forEach((id) => {
      const key = BOSSES[id].stats[kind];
      s[key] = (s[key] ?? 0) + 1;
    });
    bump(reached, 'reached');
    bump(beaten, 'defeated');
    bump(flawless, 'flawless');
    this.storage.set('stats', s);
    return { best, prevBest, newBirds: this.checkUnlocks() };
  }

  // Chosen bird id, or 'random'.
  get selected() {
    return this.storage.get('bird', 'random');
  }

  set selected(id) {
    this.storage.set('bird', id);
  }

  // The skin to use for a run: the chosen one if unlocked, else a random unlocked bird.
  skinForRun() {
    const chosen = birdById(this.selected);
    return chosen && this.isUnlocked(chosen) ? chosen : pick(this.unlockedBirds());
  }
}
