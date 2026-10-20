// Container for projectiles / pickups spawned during boss fights.
export class Hazards {
  constructor() {
    this.list = [];
  }

  add(obj) {
    this.list.push(obj);
    return obj;
  }

  clear() {
    this.list = [];
  }

  update(dt, scene) {
    // Objects may spawn others while updating (a fireball bursting into
    // embers); those land in the fresh list and are kept.
    const list = this.list;
    this.list = [];
    const kept = list.filter((o) => o.update(dt, scene) !== false);
    this.list = kept.concat(this.list);
  }

  // Lethal contact.
  collides(bird) {
    return this.list.some((o) => o.hits?.(bird));
  }

  // Collectibles the bird is touching.
  touching(bird) {
    return this.list.filter((o) => o.touches?.(bird));
  }

  render(r, alpha) {
    for (const o of this.list) o.render(r, alpha);
  }

  // Warnings and beams, drawn above the boss fog.
  renderOverlay(r, alpha) {
    for (const o of this.list) o.renderOverlay?.(r, alpha);
  }
}
