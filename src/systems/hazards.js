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
    this.list = this.list.filter((o) => o.update(dt, scene) !== false);
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
}
