const bank = {
  Dapur: [
    ['su du', 'gar pu', 'pi sau', 'ca wan', 'te ko'],
    ['ge las', 'sen duk', 'ping gan', 'be ras', 'le sung'],
  ],
  Rumah: [
    ['me ja', 'so fa', 'ting kap', 'pin tu', 'lam pu'],
    ['lang sir', 'ban tal', 'ki pas', 'ka til', 'ti kar'],
  ],
  Pasar: [
    ['i kan', 'a yam', 'te lur', 'pi sang', 'ti mun'],
    ['so tong', 'u dang', 'ku bis', 'te rung', 'na nas'],
  ],
};

const distractors = {
  sudu: 'teko', garpu: 'cawan', pisau: 'gelas', cawan: 'senduk',
  teko: 'pinggan', gelas: 'lesung', senduk: 'beras', pinggan: 'garpu',
  beras: 'pisau', lesung: 'sudu', meja: 'lampu', sofa: 'tingkap',
  tingkap: 'bantal', pintu: 'kipas', lampu: 'tikar', langsir: 'meja',
  bantal: 'pintu', kipas: 'katil', katil: 'langsir', tikar: 'sofa',
  ikan: 'pisang', ayam: 'timun', telur: 'sotong', pisang: 'udang',
  timun: 'nanas', sotong: 'kubis', udang: 'terung', kubis: 'ikan',
  terung: 'ayam', nanas: 'telur',
};

export const rounds = Object.fromEntries(Object.entries(bank).map(([theme, sets]) => [
  theme, sets.map(set => set.map(segments => segments.replaceAll(' ', ''))),
]));
export const cards = Object.fromEntries(Object.values(bank).flat(2).map(segments => {
  const syllables = segments.split(' ');
  const word = syllables.join('');
  return [word, {
    word, syllables, distractors: [distractors[word]],
    image: `./assets/photos/${word}.webp`,
    wordAudio: `./assets/audio/${word}.mp3`,
    promptAudio: `./assets/audio/pilih-${word}.mp3`,
  }];
}));
export const mediaFiles = Object.values(cards).flatMap(card => [card.image, card.wordAudio, card.promptAudio].filter(Boolean));
