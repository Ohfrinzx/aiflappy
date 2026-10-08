// Sprite registry: procedural art by default, optionally overridden by real
// PNG files (CONFIG.assets.useFiles). Also caches collision masks.
import { buildProceduralSprites } from './art/sprites.js';
import { maskFromImage, flipMaskY } from './core/collision.js';

// Files that have no procedural equivalent but are used if present.
const OPTIONAL_FILES = ['message'];

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// Nearest-neighbour upscale. Drawing this copy with smoothing on gives evenly
// sized pixels at any (non-integer) screen scale, plus clean rotated edges.
function upscale(img, k) {
  const c = document.createElement('canvas');
  c.width = img.width * k;
  c.height = img.height * k;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export class Sprites {
  constructor(hiScale = 1) {
    this.hiScale = hiScale;
    this.images = new Map();
    this.masks = new Map();
    this.colors = new Map();
  }

  set(name, img) {
    if (this.hiScale > 1) img.hi = upscale(img, this.hiScale);
    this.images.set(name, img);
    this.masks.delete(name);
    this.masks.delete(`${name}:flipY`);
    this.colors.delete(`${name}:top`);
    this.colors.delete(`${name}:bottom`);
  }

  // Color of a sprite's top or bottom edge (used to extend sky / ground).
  edgeColor(name, edge) {
    const key = `${name}:${edge}`;
    let c = this.colors.get(key);
    if (!c) {
      const img = this.get(name);
      const cv = document.createElement('canvas');
      cv.width = cv.height = 1;
      const ctx = cv.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 2, edge === 'top' ? 0 : img.height - 1, 1, 1, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      c = `rgb(${r},${g},${b})`;
      this.colors.set(key, c);
    }
    return c;
  }

  has(name) {
    return this.images.has(name);
  }

  get(name) {
    const img = this.images.get(name);
    if (!img) throw new Error(`Missing sprite: ${name}`);
    return img;
  }

  mask(name, flipY = false) {
    const key = flipY ? `${name}:flipY` : name;
    let m = this.masks.get(key);
    if (!m) {
      m = flipY ? flipMaskY(this.mask(name)) : maskFromImage(this.get(name));
      this.masks.set(key, m);
    }
    return m;
  }
}

export async function loadSprites(cfg, hiScale = 1) {
  const sprites = new Sprites(hiScale);
  const generated = buildProceduralSprites();
  for (const [name, img] of Object.entries(generated)) sprites.set(name, img);

  if (cfg.useFiles) {
    const names = [...Object.keys(generated), ...OPTIONAL_FILES];
    const loaded = await Promise.all(names.map((n) => loadImage(`${cfg.spriteDir}${n}.png`)));
    loaded.forEach((img, i) => img && sprites.set(names[i], img));
  }
  return sprites;
}
