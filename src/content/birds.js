// Bird characters, in picker order. Add an entry to add a character.
//   file:    drop-in PNG prefix (yellowbird -> yellowbird-upflap/-midflap/-downflap.png)
//   style:   optional { wings: 'bird'|'bat', accessories: [...], pattern: 'rainbow'|'flame' }
//            (see src/art/birds.js)
//   unlock:  omit for always-available; otherwise { stat, at, label } where stat
//            is one of best | runs | totalPipes | flaps | nightRuns | bossReached |
//            bossesDefeated | flawlessWins (King Crow) | phoenixReached |
//            phoenixDefeated | phoenixFlawless
//            (tracked in src/systems/progress.js)
const OUTLINE = '#533846';

const YELLOW = {
  outline: OUTLINE, highlight: '#fad78c', body: '#f8b733', belly: '#e0802c',
  white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#fc3800', lipBottom: '#fc3800',
};

export const BIRDS = [
  { id: 'yellow', name: 'Classic', file: 'yellowbird', palette: YELLOW },
  {
    id: 'blue', name: 'Blue', file: 'bluebird',
    palette: {
      outline: OUTLINE, highlight: '#54d1ff', body: '#4bc1f8', belly: '#40a4d2',
      white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#e46018', lipBottom: '#e46018',
    },
  },
  {
    id: 'red', name: 'Red', file: 'redbird',
    palette: {
      outline: OUTLINE, highlight: '#fc730f', body: '#fc3800', belly: '#d32f00',
      white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#f8b733', lipBottom: '#f8b733',
    },
  },
  {
    id: 'lime', name: 'Lime', file: 'limebird',
    unlock: { stat: 'best', at: 10, label: 'SCORE 10 IN A RUN' },
    palette: {
      outline: OUTLINE, highlight: '#c4f284', body: '#7ad83a', belly: '#4aa82a',
      white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#fc8c18', lipBottom: '#fc8c18',
    },
  },
  {
    id: 'shades', name: 'Cool', file: 'shadesbird', style: { accessories: ['shades'] },
    unlock: { stat: 'best', at: 20, label: 'SCORE 20 IN A RUN' },
    palette: YELLOW,
  },
  {
    id: 'ghost', name: 'Ghost', file: 'ghostbird',
    unlock: { stat: 'runs', at: 25, label: 'PLAY 25 RUNS' },
    palette: {
      outline: '#8a98c0cc', highlight: '#ffffffcc', body: '#e6eefacc', belly: '#c4d0eccc',
      white: '#ffffff', wing: '#f4f8ffcc', wingShade: '#d8e2f6cc', lipTop: '#a8b4e0cc', lipBottom: '#a8b4e0cc',
    },
  },
  {
    id: 'penguin', name: 'Penguin', file: 'penguinbird',
    unlock: { stat: 'best', at: 30, label: 'SCORE 30 IN A RUN' },
    palette: {
      outline: '#141420', highlight: '#3c3c52', body: '#26263a', belly: '#f4f4f4',
      white: '#ffffff', wing: '#26263a', wingShade: '#3c3c52', lipTop: '#f8a020', lipBottom: '#e08010',
    },
  },
  {
    id: 'silver', name: 'Silver', file: 'silverbird',
    unlock: { stat: 'best', at: 40, label: 'SCORE 40 IN A RUN' },
    palette: {
      outline: '#4a4e58', highlight: '#f4f6fa', body: '#c8ccd4', belly: '#9aa0aa',
      white: '#ffffff', wing: '#e8ebf0', wingShade: '#b8bcc6', lipTop: '#f8b733', lipBottom: '#e0941c',
    },
  },
  {
    id: 'owl', name: 'Owl', file: 'owlbird', style: { accessories: ['tufts'] },
    unlock: { stat: 'nightRuns', at: 10, label: 'PLAY 10 NIGHT RUNS' },
    palette: {
      outline: '#3a2410', highlight: '#d8b080', body: '#a87848', belly: '#e8d0a8',
      white: '#fff8e0', wing: '#8a5a30', wingShade: '#a87848', lipTop: '#f8c030', lipBottom: '#d89a18',
    },
  },
  {
    id: 'ninja', name: 'Ninja', file: 'ninjabird', style: { accessories: ['headband'] },
    unlock: { stat: 'totalPipes', at: 250, label: 'PASS 250 PIPES' },
    palette: {
      outline: '#0e0e14', highlight: '#4a4a58', body: '#2a2a34', belly: '#1c1c24',
      white: '#fafafa', wing: '#3a3a46', wingShade: '#2a2a34', lipTop: '#b8b8c0', lipBottom: '#b8b8c0',
    },
  },
  {
    id: 'bat', name: 'Bat', file: 'batbird', style: { wings: 'bat', accessories: ['ears'] },
    unlock: { stat: 'best', at: 50, label: 'SCORE 50 IN A RUN' },
    palette: {
      outline: '#2a1a3a', highlight: '#9a7ab8', body: '#6a4a8a', belly: '#4a3270',
      white: '#ffe8f0', wing: '#3e2858', wingShade: '#5a3e78', lipTop: '#d04060', lipBottom: '#a02848',
    },
  },
  {
    id: 'ice', name: 'Ice', file: 'icebird',
    unlock: { stat: 'best', at: 75, label: 'SCORE 75 IN A RUN' },
    palette: {
      outline: '#2a5a7a', highlight: '#f0fcff', body: '#a8e8f8', belly: '#78c8e8',
      white: '#ffffff', wing: '#e0f8ff', wingShade: '#a8e8f8', lipTop: '#f8a020', lipBottom: '#e08010',
    },
  },
  {
    id: 'robot', name: 'Robot', file: 'robotbird', style: { accessories: ['visor'] },
    unlock: { stat: 'totalPipes', at: 500, label: 'PASS 500 PIPES' },
    palette: {
      outline: '#3a3e48', highlight: '#dde3ea', body: '#a8b0bc', belly: '#7c8490',
      white: '#e8eef4', wing: '#c8ced8', wingShade: '#9098a4', lipTop: '#f8b733', lipBottom: '#d89418',
    },
  },
  {
    id: 'pirate', name: 'Pirate', file: 'piratebird', style: { accessories: ['headband', 'eyepatch'] },
    unlock: { stat: 'flaps', at: 2000, label: 'FLAP 2000 TIMES' },
    palette: {
      outline: OUTLINE, highlight: '#f0d0a0', body: '#d8a868', belly: '#b07c40',
      white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#fc8c18', lipBottom: '#fc8c18',
    },
  },
  {
    id: 'rainbow', name: 'Rainbow', file: 'rainbowbird', style: { pattern: 'rainbow' },
    unlock: { stat: 'totalPipes', at: 1000, label: 'PASS 1000 PIPES' },
    palette: YELLOW,
  },
  {
    id: 'gold', name: 'Gold', file: 'goldbird',
    unlock: { stat: 'bossReached', at: 1, label: 'REACH KING CROW' },
    palette: {
      outline: '#6a4808', highlight: '#fff2a8', body: '#f8c820', belly: '#d8940c',
      white: '#fffbe8', wing: '#ffe680', wingShade: '#f8c820', lipTop: '#ffffff', lipBottom: '#f0e0b0',
    },
  },
  {
    id: 'crowned', name: 'Royal', file: 'royalbird', style: { accessories: ['crown'] },
    unlock: { stat: 'bossesDefeated', at: 1, label: 'BEAT KING CROW' },
    palette: {
      outline: '#3a1020', highlight: '#f07090', body: '#c02848', belly: '#8a1a34',
      white: '#fafafa', wingShade: '#e8c0cc', lipTop: '#f8d030', lipBottom: '#e0b020',
    },
  },
  {
    id: 'phoenix', name: 'Phoenix', file: 'phoenixbird', style: { pattern: 'flame' },
    unlock: { stat: 'bossesDefeated', at: 3, label: 'BEAT KING CROW 3 TIMES' },
    palette: {
      outline: '#5a1408', highlight: '#ffd23a', body: '#ff7a1a', belly: '#e0281a',
      white: '#fff8e0', wing: '#ffe07a', wingShade: '#ffa21a', lipTop: '#fff07a', lipBottom: '#ffd23a',
    },
  },
  {
    id: 'angel', name: 'Angel', file: 'angelbird', style: { accessories: ['halo'] },
    unlock: { stat: 'flawlessWins', at: 1, label: 'FLAWLESS KING CROW WIN' },
    palette: {
      outline: '#8a8aa8', highlight: '#ffffff', body: '#f4f4fa', belly: '#dcdce8',
      white: '#ffffff', wing: '#ffffff', wingShade: '#e8e8f4', lipTop: '#ffd23a', lipBottom: '#f0b820',
    },
  },
  {
    id: 'ember', name: 'Ember', file: 'emberbird',
    unlock: { stat: 'phoenixReached', at: 1, label: 'REACH PHOENIX LORD' },
    palette: {
      outline: '#1a1012', highlight: '#5a4e52', body: '#3a3034', belly: '#ff7a1a',
      white: '#ffe8c0', wing: '#4a3e42', wingShade: '#ff6a1a', lipTop: '#ffb030', lipBottom: '#e8401a',
    },
  },
  {
    id: 'magma', name: 'Magma', file: 'magmabird', style: { pattern: 'lava' },
    unlock: { stat: 'phoenixDefeated', at: 1, label: 'BEAT PHOENIX LORD' },
    palette: {
      outline: '#1a0c0c', highlight: '#ffb030', body: '#c83a10', belly: '#7a1a08',
      white: '#ffe8c0', wing: '#3a2622', wingShade: '#ff6a1a', lipTop: '#ffd23a', lipBottom: '#ffb030',
    },
  },
  {
    id: 'blueflame', name: 'Blue Flame', file: 'blueflamebird', style: { pattern: 'blueflame' },
    unlock: { stat: 'phoenixDefeated', at: 3, label: 'BEAT PHOENIX LORD 3 TIMES' },
    palette: {
      outline: '#0a1a4a', highlight: '#e0f8ff', body: '#4aa8ff', belly: '#2a6aff',
      white: '#ffffff', wing: '#c8f4ff', wingShade: '#7ad8ff', lipTop: '#ffffff', lipBottom: '#a8e8ff',
    },
  },
  {
    id: 'dragon', name: 'Dragon', file: 'dragonbird', style: { wings: 'bat', accessories: ['horns'] },
    unlock: { stat: 'phoenixFlawless', at: 1, label: 'FLAWLESS PHOENIX WIN' },
    palette: {
      outline: '#0e2a14', highlight: '#8ae86a', body: '#3aa84a', belly: '#e8d870',
      white: '#fff8c0', wing: '#2a7a3a', wingShade: '#3aa84a', lipTop: '#ff6a1a', lipBottom: '#e8401a',
    },
  },
];

export const birdById = (id) => BIRDS.find((b) => b.id === id);
