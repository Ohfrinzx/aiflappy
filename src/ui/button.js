// Sprite button: sinks while pressed, fires on release over itself.
export class Button {
  constructor(sprites, name, x, y, onClick) {
    this.sprites = sprites;
    this.name = name;
    this.x = x;
    this.y = y;
    this.onClick = onClick;
    this.pressed = false;
    this.visible = true;
  }

  get img() {
    return this.sprites.get(this.name);
  }

  contains(px, py) {
    const img = this.img;
    const pad = 6; // a bit of forgiveness for fingers
    return px >= this.x - pad && px <= this.x + img.width + pad && py >= this.y - pad && py <= this.y + img.height + pad;
  }

  // Returns true if the event was consumed.
  handle(evt) {
    if (!this.visible || evt.source !== 'pointer') return false;
    if (evt.type === 'press' && this.contains(evt.x, evt.y)) {
      this.pressed = true;
      return true;
    }
    if (evt.type === 'release' && this.pressed) {
      this.pressed = false;
      if (this.contains(evt.x, evt.y)) this.onClick();
      return true;
    }
    return false;
  }

  render(r, alpha = 1) {
    if (!this.visible) return;
    r.draw(this.img, this.x, this.y + (this.pressed ? 2 : 0), alpha);
  }
}
