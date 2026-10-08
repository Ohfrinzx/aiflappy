// localStorage wrapper that never throws (private mode, blocked storage, etc).
export class Storage {
  constructor(prefix) {
    this.prefix = prefix;
  }

  get(key, fallback) {
    try {
      const raw = localStorage.getItem(`${this.prefix}.${key}`);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(`${this.prefix}.${key}`, JSON.stringify(value));
    } catch {
      /* storage unavailable: progress just won't persist */
    }
  }
}
