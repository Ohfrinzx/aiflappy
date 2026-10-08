// Every tunable number in the game lives here.
// Units: pixels in the 288x512 game space, seconds, degrees.
//
// Physics are derived from the classic 30 fps values used by FlapPyBird
// (github.com/sourabhv/FlapPyBird): flap -9 px/frame, gravity 1 px/frame²,
// max fall 10 px/frame, scroll 4 px/frame. Converted to per-second units so the
// simulation can run at a fixed 60 Hz with identical arcs.

export const CONFIG = {
  width: 288,
  height: 512,
  groundY: 400, // top of the ground strip; game area is 0..groundY
  tickRate: 60, // fixed simulation steps per second

  bird: {
    x: 57, // 20% of screen width
    startY: 244, // (512 - 24) / 2
    gravity: 900, // px/s²
    flapVelocity: -280, // px/s (gives the classic ~45 px hop)
    maxFallSpeed: 300, // px/s
    minY: -48, // can fly up to two bird-heights above the screen
    tiltUp: -20, // nose-up angle right after a flap
    tiltHold: 0.4, // seconds the nose stays up after a flap
    tiltDownSpeed: 270, // deg/s when nosing down
    tiltMax: 90, // fully nose-down
    wingFrameTime: 0.1, // seconds per wing frame (cycle 0,1,2,1)
    wingStopAngle: 80, // wings freeze once diving steeper than this
    bobAmplitude: 4, // idle hover on title / get-ready
    bobPeriod: 0.8,
    hoverY: 350, // where the bird floats on the victory screen
    crashGravity: 1800,
    crashMaxFall: 450,
    crashSpin: 240, // deg/s nose-down rotation while falling dead
  },

  pipes: {
    speed: 120, // px/s, same as ground scroll
    gap: 100,
    spacing: 150, // horizontal distance between pipe pairs
    firstX: 488, // first pipe spawns this far right (screen + 200)
    gapMinFrac: 0.2, // gap top is chosen in [0.2, 0.8) * groundY - gap
    gapRangeFrac: 0.6,
  },

  layout: {
    scoreY: 50,
    getReadyY: 120,
    tutorialY: 210,
    gameOverY: 120,
    panelY: 192,
    playButtonY: 330,
    titleLogoY: 120,
    titleBirdY: 210,
    titleButtonY: 330,
  },

  fx: {
    flashTime: 0.3,
    shakeTime: 0.25,
    shakeAmount: 3,
    fadeTime: 0.3,
  },

  // Bosses: each encounter triggers after `at` pipes have been spawned & cleared.
  // `afterDefeat`: 'end' shows the victory screen, 'continue' resumes pipes.
  bosses: {
    encounters: [{ at: 100, id: 'kingCrow' }],
    afterDefeat: 'end',
  },

  ui: {
    showPauseButton: true,
  },

  assets: {
    // Set to true to load real PNG / audio files from the folders below.
    // Any file that is missing falls back to the built-in procedural version.
    // See assets/README.md for the expected file names.
    useFiles: false,
    spriteDir: 'assets/sprites/',
    audioDir: 'assets/audio/',
    audioExtensions: ['ogg', 'wav', 'mp3'],
  },

  storageKey: 'aiflappy',
};
