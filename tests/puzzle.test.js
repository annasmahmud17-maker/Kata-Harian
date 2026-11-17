import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cards, rounds, makeChoices} from '../data.js';
import {line, makePuzzle, occurrences} from '../puzzle.js';

const approved = {
  Dapur: ['sudu garpu pisau cawan teko', 'gelas senduk pinggan beras lesung', 'mangkuk periuk kuali cerek dulang', 'sudip penapis arang api minyak'],
  Rumah: ['meja sofa tingkap pintu lampu', 'langsir bantal kipas katil tikar', 'jam kunci cermin payung bakul', 'kerusi almari laci radio telefon'],
  'Makanan & Minuman': ['ikan ayam telur pisang timun', 'sotong udang kubis terung nanas', 'nasi roti susu kopi teh', 'biskut kentang betik kelapa durian'],
  Kebersihan: ['sabun syampu tuala sikat berus', 'baldi mop kain span tisu', 'singki paip tandas bakul cermin', 'penyapu sampah habuk baju seluar'],
  'Aktiviti/Perbuatan': ['makan minum tidur mandi duduk', 'baca tulis buka tutup lari', 'masak basuh sapu lap siram', 'angkat lompat menari menyanyi berjalan'],
};

test('v2 approved bank order and spelling, syllables and retained recordings', () => {
  assert.deepEqual(rounds, Object.fromEntries(Object.entries(approved).map(([k, v]) => [k, v.map(row => row.split(' '))])));
  assert.equal(Object.values(rounds).flat(2).length, 100);
  assert.equal(Object.keys(cards).length, 98);
  assert.equal(Object.values(cards).filter(card => card.wordAudio && card.promptAudio).length, 30);
  for (const [word, card] of Object.entries(cards)) {
    assert.equal(card.word, word);
    assert.equal(card.syllables.join(''), word);
    assert(card.syllables.length >= 1 && card.syllables.length <= 3);
    assert.match(word, /^[a-z]{2,8}$/);
    for (const count of [2, 4, 6]) for (let offset = 0; offset < 20; offset++) {
      const options = makeChoices(word, count, offset);
      assert.equal(options.length, count);
      assert.equal(new Set(options).size, count);
      assert.equal(options.filter(x => x === word).length, 1);
    }
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
