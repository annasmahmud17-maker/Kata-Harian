export function line(size, first, last) {
  const startRow = Math.floor(first / size);
  const endRow = Math.floor(last / size);
  const distance = last - first;
  if (distance < 0) return [];
  const step = startRow === endRow ? 1 : distance % size === 0 ? size : 0;
  return step ? Array.from({length: distance / step + 1}, (_, i) => first + i * step) : [];
}

export function occurrences(letters, size, word) {
  const matches = [];
  for (let start = 0; start < letters.length; start++) {
    for (const step of [1, size]) {
      const end = start + (word.length - 1) * step;
      if (end >= letters.length || (step === 1 && Math.floor(start / size) !== Math.floor(end / size))) continue;
      const positions = Array.from(word, (_, i) => start + i * step);
      if (positions.map(i => letters[i]).join('') === word) matches.push(positions);
    }
  }
  return matches;
}

export function makePuzzle(size, word, random = Math.random) {
  const target = word.toUpperCase();
  if (target.length < 2 || target.length > size) throw new RangeError('Panjang perkataan tidak sesuai.');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const pick = max => Math.floor(random() * max);
  const vertical = pick(2) === 1;
  const room = size - target.length + 1;
  const start = pick(vertical ? room : size) * size + pick(vertical ? size : room);
  const positions = Array.from(target, (_, i) => start + i * (vertical ? size : 1));
  const letters = Array.from({length: size * size}, () => alphabet[pick(alphabet.length)]);
  positions.forEach((position, i) => { letters[position] = target[i]; });
  const protectedCells = new Set(positions);
  const safeLetter = [...alphabet].find(letter => !target.includes(letter));
  for (const match of occurrences(letters, size, target)) {
    const extra = match.find(position => !protectedCells.has(position));
    if (extra !== undefined) letters[extra] = safeLetter;
  }
  return {letters, positions};
}
