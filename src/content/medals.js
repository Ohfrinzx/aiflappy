// Medals, checked top to bottom; the first match is awarded.
// `test(run)` receives { score, best, bossesDefeated }.
export const MEDALS = [
  {
    id: 'champion',
    test: (r) => r.bossesDefeated > 0,
    colors: { rim: '#a8741a', base: '#f5c52b', light: '#fff1a8', emblem: '#e83a2a' },
    emblem: 'crown',
  },
  { id: 'platinum', test: (r) => r.score >= 40, colors: { rim: '#8fb4bd', base: '#dceff3', light: '#ffffff', emblem: '#b7d6dd' } },
  { id: 'gold', test: (r) => r.score >= 30, colors: { rim: '#b88a14', base: '#f5c52b', light: '#ffe98c', emblem: '#d9a520' } },
  { id: 'silver', test: (r) => r.score >= 20, colors: { rim: '#8a8a8a', base: '#c9c9c9', light: '#f2f2f2', emblem: '#acacac' } },
  { id: 'bronze', test: (r) => r.score >= 10, colors: { rim: '#94582a', base: '#d38a4b', light: '#f1b37c', emblem: '#b46e36' } },
];

export function medalFor(run) {
  return MEDALS.find((m) => m.test(run)) ?? null;
}
