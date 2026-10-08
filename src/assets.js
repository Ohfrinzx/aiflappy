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

export class Sprites {
  constructor() {
    this.images = new Map();
    this.masks = new Map();
  }

  set(name, img) {
    this.images.set(name, img);
    this.masks.delete(name);
    this.masks.delete(`${name}:flipY`);
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

export async function loadSprites(cfg) {
  const sprites = new Sprites();
  const generated = buildProceduralSprites();
  for (const [name, img] of Object.entries(generated)) sprites.set(name, img);

  if (cfg.useFiles) {
    const names = [...Object.keys(generated), ...OPTIONAL_FILES];
    const loaded = await Promise.all(names.map((n) => loadImage(`${cfg.spriteDir}${n}.png`)));
    loaded.forEach((img, i) => img && sprites.set(names[i], img));
  }
  return sprites;
}
