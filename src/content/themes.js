// Backgrounds. Add an entry here to add a new theme; `weight` controls how often
// it's picked at the start of a run (0 = only used by bosses, see
// CONFIG.bosses.encounters). `file` is the optional drop-in PNG, `ground` the
// ground strip sprite, `scenery` swaps the city skyline for other art.
export const THEMES = [
  {
    id: 'day',
    file: 'background-day',
    weight: 1,
    seed: 11,
    sky: '#4ec0ca',
    cloud: '#e9fcd9',
    cloudEdge: '#dcf7d8',
    city: '#d3efc7',
    cityEdge: '#a4ddd8',
    window: '#bae7c4',
    bush: '#5ee270',
    bushLight: '#52ca6b',
    bushEdge: '#67cc81',
  },
  {
    id: 'night',
    file: 'background-night',
    weight: 1,
    seed: 11,
    sky: '#008793',
    stars: '#aee8d2',
    cloud: '#00b3c2',
    cloudEdge: null,
    city: '#00818c',
    cityEdge: '#0093a0',
    window: '#fcb800',
    bush: '#00b200',
    bushLight: '#00a300',
    bushEdge: '#00a300',
  },
  {
    // After King Crow falls: sunset on the way to the volcano.
    id: 'dusk',
    file: 'background-dusk',
    weight: 0,
    seed: 23,
    skyTop: '#6a4a8e',
    sky: '#f2875e',
    stars: '#ffd9a0',
    cloud: '#f9b48a',
    cloudEdge: '#ffcfa6',
    city: '#7a4a6e',
    cityEdge: '#93597f',
    window: '#ffd27a',
    bush: '#3e7a4e',
    bushLight: '#356a44',
    bushEdge: '#4a8a5a',
  },
  {
    // Phoenix Lord's arena.
    id: 'volcano',
    file: 'background-volcano',
    ground: 'base-volcano',
    scenery: 'volcano',
    weight: 0,
    seed: 5,
    skyTop: '#140608',
    sky: '#5a1e20',
    stars: '#ff9a3a', // drifting embers
    cloud: '#5e2a2c',
    cloudEdge: '#6e3432',
    city: '#2a1418', // volcano cones
    cityEdge: '#3e2024',
    window: '#ff7a1a', // lava streams
    bush: '#24161a', // foreground rocks
    bushLight: '#ff6a1a',
    bushEdge: '#3a2226',
  },
];
