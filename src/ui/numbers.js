// Draws numbers from digit sprites ('0'..'9' big, 'small-0'..'small-9').
function digits(sprites, n, small) {
  return String(Math.max(0, Math.floor(n))).split('').map((d) => sprites.get(small ? `small-${d}` : d));
}

export function numberWidth(sprites, n, small = false) {
  return digits(sprites, n, small).reduce((s, img) => s + img.width, 0);
}

// align: 'center' (x = centre) | 'right' (x = right edge) | 'left'
export function drawNumber(r, sprites, n, x, y, { small = false, align = 'center', alpha = 1 } = {}) {
  const imgs = digits(sprites, n, small);
  const w = imgs.reduce((s, img) => s + img.width, 0);
  let cx = align === 'center' ? Math.round(x - w / 2) : align === 'right' ? x - w : x;
  for (const img of imgs) {
    r.draw(img, cx, y, alpha);
    cx += img.width;
  }
}
