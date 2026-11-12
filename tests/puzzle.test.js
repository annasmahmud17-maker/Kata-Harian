import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cards, rounds} from '../data.js';
import {line, makePuzzle, occurrences} from '../puzzle.js';

const bankRows = readFileSync(new URL('./bank-source.md', import.meta.url), 'utf8')
  .split('\n').filter(row => /^\| (Dapur|Rumah|Pasar) \|/.test(row));
const approved = {};
for (const row of bankRows) {
  const [theme, round, ...words] = row.split('|').slice(1, -1).map(part => part.trim());
  approved[theme] ??= [];
  approved[theme][Number(round) - 1] = words;
}

test('approved bank order, spelling, syllables and distractors', () => {
  assert.deepEqual(rounds, approved);
  assert.equal(Object.keys(cards).length, 30);
  for (const [word, card] of Object.entries(cards)) {
    assert.equal(card.word, word);
    assert.equal(card.syllables.join(''), word);
    assert.equal(card.syllables.length, 2);
    assert.match(word, /^[a-z]{2,8}$/);
    assert(card.distractors.every(other => other !== word && cards[other]));
  }
});

test('exactly one forward occurrence for all cards, both directions and eligible sizes', () => {
  for (const word of [...Object.keys(cards), 'sekolah', 'abcdefgh', 'aaaaa']) {
    for (const size of [5, 8].filter(n => n >= word.length)) {
      for (let i = 0; i < 150; i++) {
        const {letters, positions} = makePuzzle(size, word);
        assert.deepEqual(occurrences(letters, size, word.toUpperCase()), [positions]);
        assert.deepEqual(line(size, positions.at(0), positions.at(-1)), positions);
      }
    }
  }
});

test('rejects reverse, diagonal and row wrapping, and catches repeated filler', () => {
  assert.deepEqual(line(5, 2, 0), []);
  assert.deepEqual(line(5, 0, 6), []);
  assert.deepEqual(line(5, 4, 5), []);
  assert.deepEqual(line(5, 2, 2), [2]);
  assert.throws(() => makePuzzle(5, 'pinggan'), RangeError);
  for (const sample of [0, 0.5, 0.999]) {
    const {letters, positions} = makePuzzle(8, 'aaaaa', () => sample);
    assert.deepEqual(occurrences(letters, 8, 'AAAAA'), [positions]);
  }
});
