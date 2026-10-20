// Boss registry: CONFIG.bosses.encounters reference these ids.
//   name:    shown in practice mode
//   preview: sprite shown on the practice card
//   stats:   progress counters (src/systems/progress.js) for reaching, beating
//            and beating without losing a life (bird unlocks use these)
import { KingCrow } from './kingCrow.js';
import { PhoenixLord } from './phoenixLord.js';

export const BOSSES = {
  kingCrow: {
    name: 'King Crow',
    Ctor: KingCrow,
    preview: 'kingcrow-0',
    stats: { reached: 'bossReached', defeated: 'bossesDefeated', flawless: 'flawlessWins' },
  },
  phoenixLord: {
    name: 'Phoenix Lord',
    Ctor: PhoenixLord,
    preview: 'phoenix-0',
    stats: { reached: 'phoenixReached', defeated: 'phoenixDefeated', flawless: 'phoenixFlawless' },
  },
};
