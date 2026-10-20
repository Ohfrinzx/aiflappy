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

  // Bosses: each encounter triggers after `at` pipes have been spawned & cleared
  // (boss hits add score but don't count as pipes). `theme` swaps the background
  // when its WARNING starts, `then` swaps it after the boss is beaten.
  // Pipes resume after every boss but the last; `afterDefeat` decides what the
  // last one does: 'end' shows the victory screen, 'continue' resumes pipes.
  bosses: {
    encounters: [
      { at: 100, id: 'kingCrow', then: 'dusk' },
      { at: 150, id: 'phoenixLord', theme: 'volcano' },
    ],
    afterDefeat: 'end',

    // Lives you get during a boss fight (pipes outside bosses stay one-hit).
    // Any hit, including touching the ground, costs one and bounces you up.
    playerLives: 2,
    invulnTime: 1.5, // seconds of blinking invincibility after losing a life

    // King Crow difficulty. Arrays are per phase [1, 2, 3]; phase 2 starts at
    // phaseAt[0] HP, phase 3 ("enraged") at phaseAt[1]. Comments show the
    // original easier values (v1.3 and earlier had only 2 phases).
    kingCrow: {
      damagePerHit: 1, // DAMAGE YOU DEAL: HP removed per caught orb
      lives: 4, // health bars; each is a full `hp` bar (was 1)
      hp: 10, // HP per health bar (was 6)
      phaseAt: [6, 3], // was a single change at 3 HP
      volleyShots: [4, 6, 8], // was [3, 5]
      volleySpeed: [220, 260, 300], // was [190, 230]
      volleyGap: [0.22, 0.15, 0.1], // pause between shots, was [0.3, 0.15]
      volleyLead: [0, 0.5, 0.8], // how much it aims ahead of your movement (was 0)
      fanCount: [5, 7, 9], // feathers per wave, was [3, 5]
      fanWaves: [3, 4, 5], // was [2, 3]
      fanSpeed: [160, 180, 200], // was [150, 170]
      fanSpread: [50, 60, 72], // total angle in degrees, was [44, 56]
      fanHole: 48, // every fan wave leaves a gap at least this tall (px) for the bird
      wallPipes: [4, 5, 6], // was [3, 4]
      wallSpeed: [165, 185, 205], // was [155, 175]
      wallGap: [106, 100, 96], // was 112
      wallSway: [0, 22, 30], // gaps slide up/down (px), was 0
      wallSniping: [false, false, true], // stays on screen shooting during walls
      chargeTrack: [0.75, 0.6, 0.5], // seconds it follows you before locking
      chargeLock: [0.35, 0.3, 0.25], // warning time after locking
      chargeSpeed: [560, 620, 700], // was 560 (phase 2 only)
      chargeCount: [1, 1, 2], // back-to-back dashes
      rainCount: [0, 14, 22], // feather storm (phases 2-3): feathers per storm
      rainSpeed: [0, 240, 280],
      rainAngle: [0, 32, 38], // degrees below horizontal, coming from the top-right
      rainSafeBand: [0, 76, 62], // height of the drifting safe gap (px); bird is 24
      orbSpeed: [130, 145, 160], // was [100, 115]
      restAfterOrb: [0.8, 0.6, 0.45], // was [1.4, 1.0]
    },

    // Phoenix Lord (pipe 150), the final boss: tuned harder than King Crow.
    // Arrays are per phase [1, 2, 3]; phase 3 burns blue and adds ash fog.
    // Damage comes from frost orbs. Comments show the v1.9.0 (easier) values.
    phoenixLord: {
      damagePerHit: 1, // DAMAGE YOU DEAL: HP removed per caught frost orb
      lives: 4, // health bars (each one a "rebirth")
      hp: 10, // HP per health bar
      phaseAt: [6, 3],
      beamLanes: [1, 2, 3], // flame beams per round (the first tracks you), was [1, 2, 2]
      beamCombos: [2, 2, 3], // back-to-back beam rounds, was [1, 1, 2]
      beamTrack: [0.75, 0.6, 0.5], // seconds the lane follows you (was fixed)
      beamLock: [0.4, 0.35, 0.3], // warning time after it locks
      beamTime: [0.7, 0.8, 0.9], // how long a beam burns
      beamHalf: 20, // half-height of a beam (px); bird is 24 tall
      beamGap: 96, // min distance between beam centres in the same round
      diveCount: [1, 2, 2], // flame dive: tracked dash across the screen
      diveTrack: [0.7, 0.6, 0.5], // seconds it follows you before locking
      diveLock: [0.35, 0.3, 0.25], // warning time after locking
      diveSpeed: [600, 660, 720],
      diveTrail: 0.5, // seconds its fire trail keeps burning after it passes
      pillarCount: [4, 5, 6], // lava pillar walls, was [3, 4, 5]
      pillarSpeed: [170, 190, 210],
      pillarGap: [104, 98, 94],
      pillarSway: [0, 20, 28],
      pillarSniping: [false, true, true], // throws embers during pillar walls, was phase 3 only
      fireballs: [3, 4, 5], // lobbed fireballs that burst into an ember ring, was [2, 3, 4]
      fireballFlight: [0.9, 0.8, 0.7], // seconds in the air
      fireballGap: [0.6, 0.5, 0.4], // pause between throws
      burstCount: [10, 10, 12], // embers per ring (even spacing leaves gaps), was [8, 8, 10]
      burstSpeed: [130, 150, 170],
      spiralTime: [0, 2.6, 3.2], // ember spiral (phases 2-3), seconds
      spiralArms: [0, 2, 3],
      spiralSpeed: [0, 150, 170],
      spiralSafeBand: [0, 80, 66], // drifting safe gap the spiral never crosses (px)
      wisps: [2, 3, 4], // homing wisps (was phases 2-3 only)
      wispSpeed: [115, 125, 145], // leftward speed
      wispTurn: [60, 70, 85], // max vertical speed while homing (bird is faster)
      fogRadius: 104, // phase 3 ash fog: clear radius around the bird (px)
      fogChance: 0.5, // share of phase 3 attacks under fog
      orbSpeed: [135, 150, 165],
      restAfterOrb: [0.6, 0.45, 0.3], // was [0.75, 0.55, 0.4]
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
