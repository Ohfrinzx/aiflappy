// Every tunable number in the game lives here.
// Units: pixels in the 288x512 game space, seconds, degrees.
//
// Physics are derived from the classic 30 fps values used by FlapPyBird
// (github.com/sourabhv/FlapPyBird): flap -9 px/frame, gravity 1 px/frame²,
// max fall 10 px/frame, scroll 4 px/frame. Converted to per-second units so the
// simulation can run at a fixed rate (120 Hz) with near-identical arcs.

export const CONFIG = {
  width: 288,
  height: 512,
  groundY: 400, // top of the ground strip; game area is 0..groundY
  tickRate: 120, // fixed simulation steps per second (matches ProMotion displays)

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

    // King Crow difficulty. Arrays are per phase [1, 2, 3]; phase 2 starts at
    // phaseAt[0] HP, phase 3 ("enraged") at phaseAt[1]. Comments show the
    // original easier values (v1.3 and earlier had only 2 phases).
    kingCrow: {
      hp: 10, // was 6
      phaseAt: [6, 3], // was a single change at 3 HP
      volleyShots: [4, 6, 8], // was [3, 5]
      volleySpeed: [220, 260, 300], // was [190, 230]
      volleyGap: [0.22, 0.15, 0.1], // pause between shots, was [0.3, 0.15]
      volleyLead: [0, 0.5, 0.8], // how much it aims ahead of your movement (was 0)
      fanCount: [5, 7, 9], // feathers per wave, was [3, 5]
      fanWaves: [3, 4, 5], // was [2, 3]
      fanSpeed: [160, 180, 200], // was [150, 170]
      fanSpread: [50, 60, 72], // total angle in degrees, was [44, 56]
      wallPipes: [4, 5, 6], // was [3, 4]
      wallSpeed: [165, 185, 205], // was [155, 175]
      wallGap: [106, 100, 96], // was 112
      wallSway: [0, 22, 30], // gaps slide up/down (px), was 0
      wallSniping: [false, false, true], // stays on screen shooting during walls
      chargeTrack: [0.75, 0.6, 0.5], // seconds it follows you before locking
      chargeLock: [0.35, 0.3, 0.25], // warning time after locking
      chargeSpeed: [560, 620, 700], // was 560 (phase 2 only)
      chargeCount: [1, 1, 2], // back-to-back dashes
      rainCount: [0, 14, 22], // falling feathers (new attack, phases 2-3)
      rainSpeed: [0, 240, 280],
      rainSniping: [false, false, true], // also shoots aimed feathers during rain
      orbSpeed: [130, 145, 160], // was [100, 115]
      restAfterOrb: [0.8, 0.6, 0.45], // was [1.4, 1.0]
    },
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
