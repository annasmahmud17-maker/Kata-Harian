const bank = {
  Dapur: [
    ['su du', 'gar pu', 'pi sau', 'ca wan', 'te ko'],
    ['ge las', 'sen duk', 'ping gan', 'be ras', 'le sung'],
    ['mang kuk', 'pe ri uk', 'ku a li', 'ce rek', 'du lang'],
    ['su dip', 'pe na pis', 'a rang', 'a pi', 'mi nyak'],
  ],
  Rumah: [
    ['me ja', 'so fa', 'ting kap', 'pin tu', 'lam pu'],
    ['lang sir', 'ban tal', 'ki pas', 'ka til', 'ti kar'],
    ['jam', 'kun ci', 'cer min', 'pa yung', 'ba kul'],
    ['ke ru si', 'al ma ri', 'la ci', 'ra di o', 'te le fon'],
  ],
  'Makanan & Minuman': [
    ['i kan', 'a yam', 'te lur', 'pi sang', 'ti mun'],
    ['so tong', 'u dang', 'ku bis', 'te rung', 'na nas'],
    ['na si', 'ro ti', 'su su', 'ko pi', 'teh'],
    ['bis kut', 'ken tang', 'be tik', 'ke la pa', 'du ri an'],
  ],
  Kebersihan: [
    ['sa bun', 'syam pu', 'tu a la', 'si kat', 'be rus'],
    ['bal di', 'mop', 'ka in', 'span', 'ti su'],
    ['sing ki', 'pa ip', 'tan das', 'ba kul', 'cer min'],
    ['pe nya pu', 'sam pah', 'ha buk', 'ba ju', 'se lu ar'],
  ],
  'Aktiviti/Perbuatan': [
    ['ma kan', 'mi num', 'ti dur', 'man di', 'du duk'],
    ['ba ca', 'tu lis', 'bu ka', 'tu tup', 'la ri'],
    ['ma sak', 'ba suh', 'sa pu', 'lap', 'si ram'],
    ['ang kat', 'lom pat', 'me na ri', 'me nya nyi', 'ber ja lan'],
  ],
};

import {images} from './images.js';

export const questionAudio = './assets/audio/apakah-yang-sedang-dilakukan.mp3';

export const rounds = Object.fromEntries(Object.entries(bank).map(([theme, sets]) => [
  theme, sets.map(set => set.map(segments => segments.replaceAll(' ', ''))),
]));
export const cards = Object.fromEntries(Object.values(bank).flat(2).map(segments => {
  const syllables = segments.split(' ');
  const word = syllables.join('');
  return [word, {
    word, syllables,
    ...(images[word] || {image: `./assets/photos/${word}.webp`}),
    wordAudio: `./assets/audio/${word}.mp3`,
    promptAudio: `./assets/audio/pilih-${word}.mp3`,
  }];
}));
export const mediaFiles = [...new Set([questionAudio, ...Object.values(cards).flatMap(card => [card.image, card.wordAudio, card.promptAudio].filter(Boolean))])];

const activityWords = rounds['Aktiviti/Perbuatan'].flat();
const excludedActivityPairs = {
  berjalan: 'lari', lari: 'berjalan',
  buka: 'tutup', tutup: 'buka',
};

export function makeChoices(word, count, offset = 0, photoTheme = null) {
  const activityPhotos = photoTheme === 'Aktiviti/Perbuatan';
  const candidates = activityPhotos ? activityWords : Object.keys(cards);
  const pool = candidates.filter(other => other !== word &&
    (!activityPhotos || other !== excludedActivityPairs[word]));
  const start = offset % pool.length;
  const result = [...pool.slice(start), ...pool.slice(0, start)].slice(0, count - 1);
  result.splice(offset % count, 0, word);
  return result;
}
