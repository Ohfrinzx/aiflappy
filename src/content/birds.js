// Bird skins. Add an entry to add a skin. `file` is the drop-in PNG prefix
// (e.g. yellowbird -> yellowbird-upflap.png / -midflap.png / -downflap.png).
const OUTLINE = '#533846';

export const BIRDS = [
  {
    id: 'yellow',
    file: 'yellowbird',
    weight: 1,
    palette: {
      outline: OUTLINE, highlight: '#fad78c', body: '#f8b733', belly: '#e0802c',
      white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#fc3800', lipBottom: '#fc3800',
    },
  },
  {
    id: 'blue',
    file: 'bluebird',
    weight: 1,
    palette: {
      outline: OUTLINE, highlight: '#54d1ff', body: '#4bc1f8', belly: '#40a4d2',
      white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#e46018', lipBottom: '#e46018',
    },
  },
  {
    id: 'red',
    file: 'redbird',
    weight: 1,
    palette: {
      outline: OUTLINE, highlight: '#fc730f', body: '#fc3800', belly: '#d32f00',
      white: '#fafafa', wingShade: '#d7e6cc', lipTop: '#f8b733', lipBottom: '#f8b733',
    },
  },
];
