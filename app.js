import {cards, rounds, makeChoices} from './data.js';
import {line, makePuzzle} from './puzzle.js';

const app = document.querySelector('#app');
const bar = document.querySelector('.bar');
const landscape = matchMedia('(orientation: landscape)');
let puzzleHeading;
const standalone = matchMedia('(display-mode: standalone)');
const installed = () => standalone.matches || navigator.standalone === true || installCompleted;
let installPrompt;
let installCompleted = false;
let screen = 'home';
let activity;
let theme;
let round;
let index;
let deck;
let card;
let phase;
let puzzle;
let gridSize = 8;
let selectedSize = 8;
let first = null;
let hint = false;
let aid = false;
let solved = false;
let choices = [];
let choiceCount = 2;
let promptMode = 'listen';
const seenGuides = new Set();
let guideReturn;
let choiceComplete = false;
let chosen = '';
let audio;
let pointer;
let cells = [];

const activityNames = {name: 'Sebut Nama', choose: 'Pilih Gambar', words: 'Pilih Perkataan'};
const instructions = {
  name: [
    ['Lihat gambar dan cuba sebut namanya.', 'Look at the picture and try to name it.'],
    ['Tekan <strong>Jawapan</strong> untuk mendengar perkataan.', 'Tap <strong>Jawapan</strong> to hear the word.'],
    ['Seret pada huruf, atau ketik huruf pertama dan terakhir. Tekan <strong>Langkau</strong> jika perlu.', 'Drag across the letters, or tap the first and last letters. Tap <strong>Langkau</strong> to skip.'],
  ],
  choose: [
    ['Pilih <strong>Dengar</strong> atau <strong>Baca</strong>, kemudian pilih bilangan gambar.', 'Choose <strong>Dengar</strong> (listen) or <strong>Baca</strong> (read), then choose how many pictures to show.'],
    ['Dengar atau baca perkataan. Tekan gambar yang sepadan.', 'Listen to or read the word. Tap the matching picture.'],
  ],
  words: [
    ['Pilih bilangan pilihan. Dengar perkataan dalam bahasa Melayu.', 'Choose how many options to show. Listen to the Malay word.'],
    ['Tekan perkataan yang sepadan. Tekan <strong>Dengar Semula</strong> jika perlu.', 'Tap the matching written word. Tap <strong>Dengar Semula</strong> to hear it again.'],
  ],
};
const choiceLabels = {
  name: ['Sebut nama dan cari kata.', 'Say and find the word.'],
  choose: ['Dengar atau baca. Pilih gambar.', 'Listen or read. Pick a picture.'],
  words: ['Dengar dan pilih kata.', 'Listen and pick the word.'],
};

function guideSeen() {
  try { return seenGuides.has(activity) || localStorage.getItem(`kh-guide-${activity}`) === 'seen'; }
  catch { return seenGuides.has(activity); }
}

function guide(returnTo = themes) {
  guideReturn = returnTo;
  screen = 'guide';
  show(`${heading('Cara Bermain / <span lang="en">How to Play</span>', activityNames[activity])}
    <ol class="guide">${instructions[activity].map(([ms, en]) => `<li>${ms}<p lang="en">${en}</p></li>`).join('')}</ol>
    <div class="guide-note"><p>Beri masa untuk mencuba. Anda boleh membantu jika diperlukan.</p>
    <p lang="en">Give the player time to try. You can help if needed.</p></div>
    <div class="actions">${buttons('start-mode', 'Mula / <span lang="en">Start</span>', 'primary')}</div>`);
}
const buttons = (action, text, kind = 'secondary', extra = '') =>
  `<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${text}</button>`;

function heading(title, detail = '') {
  return `<header class="section-heading">${detail ? `<p class="context">${detail}</p>` : ''}<h1 tabindex="-1">${title}</h1></header>`;
}

function positionPuzzleHeading() {
  if (!puzzleHeading) return;
  const destination = landscape.matches ? bar : app.querySelector('.name-layout');
  if (puzzleHeading.parentElement !== destination) destination.prepend(puzzleHeading);
}

function show(markup) {
  puzzleHeading?.remove();
  puzzleHeading = undefined;
  pointer = null;
  cells = [];
  app.dataset.screen = screen;
  app.innerHTML = markup;
  puzzleHeading = app.querySelector('.name-layout .section-heading');
  positionPuzzleHeading();
  app.querySelectorAll('img[data-media]').forEach(img => {
    const fail = () => {
      img.hidden = true;
      img.nextElementSibling.hidden = false;
      const button = img.closest('button');
      if (button) button.disabled = true;
    };
    img.addEventListener('error', fail, {once: true});
    if (img.complete && !img.naturalWidth) fail();
  });
  window.scrollTo(0, 0);
  (puzzleHeading || app).querySelector('h1')?.focus({preventScroll: true});
}

function photo(item, label = 'Gambar objek') {
  if (item.tile) {
    const [cols, rows, x, y] = item.tile;
    return `<span class="object-photo atlas-photo"><span class="atlas-window"><img data-media src="${item.image}" alt="${label}" style="width:${cols * 100}%;height:${rows * 100}%;left:${-x * 100}%;top:${-y * 100}%"><span class="media-error" hidden>Gambar belum tersedia. Sambung ke internet dan cuba lagi.</span></span></span>`;
  }
  return `<img class="object-photo" data-media src="${item.image}" alt="${label}"><span class="media-error" hidden>Gambar belum tersedia. Sambung ke internet dan cuba lagi.</span>`;
}

function stopAudio() {
  if (!audio) return;
  audio.pause();
  audio = undefined;
}

function home() {
  stopAudio();
  screen = 'home';
  show(`<section class="hero">
    <img class="logo" src="./assets/icons/logo.webp" alt="Logo KH" width="180" height="180">
    ${heading('Kata Harian')}
    <p class="tagline">Bahan latihan perkataan harian</p>
  </section>
  <div class="activity-list">
    ${Object.entries(activityNames).map(([key, title]) => `<button class="activity-card" data-action="mode" data-value="${key}"><span><strong>${title}</strong><small>${choiceLabels[key][0]}</small><small lang="en">${choiceLabels[key][1]}</small></span><span aria-hidden="true">›</span></button>`).join('')}
  </div>
  <div id="install-area">${installed() ? '' : buttons('install', 'Pasang Aplikasi', 'quiet')}${!installed() ? '<div id="install-help" class="note" hidden></div>' : ''}</div>`);
}

function themes() {
  screen = 'themes';
  show(`${heading('Pilih kategori', activityNames[activity])}<div class="menu">${Object.keys(rounds).map(value =>
    buttons('theme', value, 'secondary', `data-value="${value}"`)).join('')}</div>`);
}

function roundMenu() {
  screen = 'rounds';
  show(`${heading('Pilih tahap', `${activityNames[activity]} · ${theme}`)}
  <div class="menu">${rounds[theme].map((_, i) => buttons('round', `Tahap ${i + 1} · 5 kad`, 'secondary', `data-value="${i}"`)).join('')}</div>
  ${buttons('themes', 'Tukar kategori', 'quiet')}`);
}

function setup() {
  screen = 'setup';
  show(`${heading('Tetapan pusingan', activityNames[activity])}
    <form id="round-settings" class="menu round-settings">
      ${activity === 'choose' ? `<fieldset><legend>Arahan</legend>
        <label><input type="radio" name="prompt" value="listen" ${promptMode === 'listen' ? 'checked' : ''}> Dengar</label>
        <label><input type="radio" name="prompt" value="read" ${promptMode === 'read' ? 'checked' : ''}> Baca</label>
      </fieldset>` : ''}
      <fieldset><legend>${activity === 'choose' ? 'Bilangan gambar' : 'Bilangan pilihan'}</legend>
        ${[2, 4, 6].map(count => `<label><input type="radio" name="count" value="${count}" ${count === choiceCount ? 'checked' : ''}> ${count}</label>`).join('')}
      </fieldset>
      <button type="submit" class="button primary">Mula pusingan</button>
      ${buttons('guide', 'Cara Bermain / <span lang="en">How to Play</span>', 'quiet')}
    </form>`);
}

function startRound() {
  deck = rounds[theme][round];
  index = 0;
  startCard();
}

function startCard() {
  stopAudio();
  screen = 'play';
  card = cards[deck[index]];
  phase = 'photo';
  hint = aid = solved = choiceComplete = false;
  first = null;
  chosen = '';
  gridSize = card.word.length <= 5 ? selectedSize : 8;
  puzzle = null;
  if (activity === 'name') {
    renderName();
  } else {
    choices = makeChoices(card.word, choiceCount, index * 3 + round);
    renderChoice();
    if (activity === 'words' || promptMode === 'listen') actions['prompt-audio']();
  }
}

function cardHeading(title) {
  return heading(title, `${activityNames[activity]} · ${theme} · Kad ${index + 1} daripada ${deck.length}`);
}

function syllableWord() {
  return `<span class="syllable-word" role="img" aria-label="${card.word}">${card.syllables.map((part, i) =>
    `<span aria-hidden="true" class="${i % 2 === 0 ? 'red' : ''}">${part}</span>`).join('')}</span>`;
}

function answer() {
  return `<div class="answer" id="answer" hidden>
    <div class="answer-line"><span class="answer-word">${syllableWord()}</span>
    ${buttons('word-audio', 'Dengar Jawapan', 'secondary', `aria-disabled="${!card.wordAudio}"`)}</div>
    <p class="audio-status" id="answer-status" role="status">${card.wordAudio ? '' : 'Rakaman belum tersedia. Pendamping boleh menyebut jawapan.'}</p>
    ${buttons('next', 'Seterusnya', 'primary')}
  </div>`;
}

function renderName() {
  if (phase === 'photo') {
    show(`<section class="intro-layout"><figure class="picture intro-photo">${photo(card)}</figure>
      <div>${cardHeading(theme === 'Aktiviti/Perbuatan' ? 'Apakah yang sedang dilakukan?' : 'Apa ini?')}<div class="actions">${buttons('puzzle', 'Jawapan', 'primary')}</div></div></section>`);
    return;
  }

  const fit = card.word.length <= 5;
  show(`<section class="name-layout">${cardHeading('Cari perkataan')}
    <div class="puzzle-side">
      <figure class="picture">${photo(card)}</figure>
      <div id="puzzle-actions" class="actions wrap"><div class="puzzle-buttons">
        ${buttons('word-audio', 'Dengar Semula')}${buttons('puzzle-help', 'Petunjuk', 'secondary', 'aria-expanded="false" aria-controls="puzzle-tools"')}</div>${buttons('skip', 'Langkau', 'quiet')}
      </div>
      <div id="puzzle-size" class="size-row" role="group" aria-label="Saiz petak">
          ${[8, 5].map(size => buttons('size', `${size} × ${size}`, 'size', `data-value="${size}" aria-pressed="${gridSize === size}" ${size === 5 && !fit ? 'disabled aria-describedby="size-help"' : ''}`)).join('')}
          ${fit ? '' : '<p id="size-help">Perkataan ini perlukan petak 8 × 8.</p>'}
      </div>
      <div id="puzzle-tools" hidden>
        <div class="actions wrap">${buttons('hint', 'Tunjuk Huruf Pertama')}${buttons('aid', 'Tunjuk Perkataan')}</div>
      </div>
      <p id="aid" class="aid" hidden>${card.word}</p>
      <p class="audio-status" id="audio-status" role="status"></p>
      <p class="feedback" id="feedback" role="status"></p>
    </div>
    <div class="practice">
      <div class="grid" id="grid" role="group" aria-label="Petak huruf ${gridSize} darab ${gridSize}" style="--size:${gridSize}">
        ${puzzle.letters.map((letter, i) => `<button type="button" class="cell" data-cell="${i}" tabindex="${i === 0 ? 0 : -1}" aria-label="${letter}, baris ${Math.floor(i / gridSize) + 1}, lajur ${i % gridSize + 1}" aria-pressed="false">${letter}</button>`).join('')}
      </div>
      <div class="answer-space">${answer()}</div>
    </div>
  </section>`);
  cells = [...app.querySelectorAll('.cell')];
}

function renderChoice() {
  const words = activity === 'words';
  const read = !words && promptMode === 'read';
  show(`${cardHeading(activityNames[activity])}
    <section class="choice-layout">
      <div class="prompt">
        ${buttons('prompt-audio', read ? 'Dengar Perkataan' : 'Dengar Semula', 'primary')}
        ${read ? `<p class="choice-target">${syllableWord()}</p>` : buttons('choice-hint', words ? 'Tunjuk Gambar' : 'Tunjuk Perkataan', 'quiet', 'aria-expanded="false" aria-controls="choice-hint"')}
        ${read ? '' : `<div id="choice-hint" hidden>${words ? photo(card) : `<p class="choice-target">${syllableWord()}</p>`}</div>`}
        <div id="companion" hidden><details><summary>Teks untuk pendamping</summary><p>Bacakan: <strong>${words || read ? card.word : `Pilih ${card.word}.`}</strong></p></details></div>
        <p class="audio-status" id="audio-status" role="status"></p>
      </div>
      <div class="choice-body">
        <div class="choices ${words ? 'word-options' : 'photo-options'}" data-count="${choiceCount}">${choices.map((word, i) =>
          `<button type="button" class="choice ${words ? 'word-choice button' : 'photo-choice'}" data-action="pick" data-value="${word}" ${words ? '' : `aria-label="Gambar ${i + 1}"`} aria-pressed="false">${words ? word : photo(cards[word], '')}</button>`).join('')}</div>
        <div class="choice-footer">
          <p id="feedback" class="feedback" role="status"></p>
          <div id="choice-next" hidden>${buttons('next', 'Seterusnya', 'primary')}</div>
          <div id="choice-skip">${buttons('skip', 'Langkau', 'quiet')}</div>
        </div>
      </div>
    </section>`);
}

function finish() {
  stopAudio();
  screen = 'end';
  show(`${heading('Pusingan selesai', `${activityNames[activity]} · ${theme}`)}
    <div class="menu">${buttons('replay', 'Ulang pusingan', 'primary')}
    ${activity === 'name' ? buttons('same-round', 'Cuba pusingan ini dalam Pilih Gambar') : ''}
    ${buttons('home', 'Ke laman utama')}</div>`);
}

function next() {
  if (!solved && !choiceComplete) return;
  index += 1;
  if (index === deck.length) finish();
  else startCard();
}

function mark(path = [], preview = false) {
  cells.forEach((cell, i) => {
    const active = path.includes(i);
    cell.classList.toggle('selected', active);
    cell.classList.toggle('preview', active && preview);
    cell.classList.toggle('hint', hint && !solved && i === puzzle.positions[0]);
    cell.setAttribute('aria-pressed', String(active));
  });
}

function message(text) {
  document.querySelector('#feedback').textContent = text;
}

function reveal(text, found = true) {
  stopAudio();
  solved = true;
  mark(found ? puzzle.positions : []);
  for (const cell of cells) cell.tabIndex = -1;
  for (const id of ['puzzle-tools', 'puzzle-size', 'puzzle-actions', 'aid', 'audio-status']) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  document.querySelector('#answer').hidden = false;
  const target = document.querySelector('#answer [data-action="word-audio"]');
  target.focus({preventScroll: true});
  document.querySelector('#answer').scrollIntoView({block: 'nearest'});
  message(text);
}

function submit(start, end) {
  first = null;
  const path = line(gridSize, start, end);
  if (path.length && path.map(i => puzzle.letters[i]).join('') === card.word.toUpperCase()) {
    reveal('Perkataan dijumpai.');
  } else {
    mark();
    message('Cuba lagi.');
  }
}

function tapCell(i) {
  if (solved) return;
  if (first === null) {
    first = i;
    mark([i]);
    message('Pilih huruf terakhir.');
  } else if (first === i) {
    first = null;
    mark();
    message('Pilih huruf pertama.');
  } else submit(first, i);
}

function choose(word, skipped = false) {
  if (choiceComplete) return;
  chosen = word;
  choiceComplete = skipped || chosen === card.word;
  for (const button of app.querySelectorAll('.choice')) {
    const active = button.dataset.value === chosen;
    button.classList.toggle('picked', active);
    button.setAttribute('aria-pressed', String(active));
    if (choiceComplete && !button.disabled) button.setAttribute('aria-disabled', 'true');
  }
  if (!skipped && choiceComplete && activity === 'choose' && promptMode === 'read') {
    document.querySelector('#feedback').innerHTML = `Pilihan tepat. ${syllableWord()}.`;
  } else {
    message(skipped ? 'Kad dilangkau.' : choiceComplete ? `Pilihan tepat. ${card.word}.` : 'Cuba lagi.');
  }
  if (choiceComplete) {
    document.querySelector('#choice-skip').hidden = true;
    document.querySelector('#choice-next').hidden = false;
    app.querySelector('[data-action="next"]').focus({preventScroll: true});
  }
}

function playAudio(url) {
  const status = document.querySelector(solved ? '#answer-status' : '#audio-status');
  if (!url) {
    status.textContent = 'Rakaman belum tersedia.';
    const companion = document.querySelector('#companion');
    if (companion) companion.hidden = false;
    return;
  }
  stopAudio();
  const player = new Audio(url);
  audio = player;
  status.textContent = '';
  player.play().catch(() => {
    if (audio !== player || !status.isConnected) return;
    status.textContent = navigator.onLine ? 'Audio tidak dapat dimainkan. Cuba lagi.' : 'Audio belum tersedia di luar talian.';
    const companion = document.querySelector('#companion');
    if (companion) {
      companion.hidden = false;
      companion.querySelector('details').open = true;
    }
  });
}

function install() {
  if (installPrompt) {
    const prompt = installPrompt;
    installPrompt = undefined;
    prompt.prompt().catch(() => install());
    return;
  }
  const help = document.querySelector('#install-help');
  if (!help) return;
  help.hidden = !help.hidden;
  help.innerHTML = `<p><strong>iPhone dan iPad</strong> · Dalam Safari, tekan Kongsi (Share) → Tambah ke Skrin Utama (Add to Home Screen). Hidupkan Open as Web App jika tersedia, kemudian tekan Tambah (Add).</p>
  <p><strong>Android</strong> · Dalam Chrome, buka menu ⋮. Pilih Install app, Install and create shortcut atau Add to Home screen, mengikut pilihan yang dipaparkan.</p>`;
}

const actions = {
  home, themes, next, install,
  mode(value) {
    activity = value;
    choiceCount = 2;
    promptMode = 'listen';
    if (guideSeen()) themes();
    else guide();
  },
  guide() { guide(screen === 'setup' ? setup : themes); },
  'start-mode'() {
    seenGuides.add(activity);
    try { localStorage.setItem(`kh-guide-${activity}`, 'seen'); } catch {}
    guideReturn();
  },
  theme(value) { theme = value; roundMenu(); },
  round(value) { round = Number(value); if (activity === 'name') startRound(); else setup(); },
  replay: startRound,
  'same-round'() {
    activity = 'choose';
    choiceCount = 2;
    promptMode = 'listen';
    if (guideSeen()) setup();
    else guide(setup);
  },
  puzzle() {
    phase = 'puzzle';
    puzzle = makePuzzle(gridSize, card.word);
    renderName();
    playAudio(card.wordAudio);
  },
  size(value) {
    const size = Number(value);
    if (size === gridSize || card.word.length > size || solved) return;
    const helpOpen = !document.getElementById('puzzle-tools').hidden;
    selectedSize = gridSize = size;
    first = null;
    puzzle = makePuzzle(size, card.word);
    renderName();
    if (helpOpen) actions['puzzle-help']();
    if (hint) actions.hint();
    if (aid) actions.aid();
    app.querySelector(`[data-action="size"][data-value="${size}"]`).focus();
  },
  'puzzle-help'() {
    const tools = document.getElementById('puzzle-tools');
    tools.hidden = !tools.hidden;
    app.querySelector('[data-action="puzzle-help"]').setAttribute('aria-expanded', String(!tools.hidden));
  },
  'choice-hint'() {
    const target = document.getElementById('choice-hint');
    target.hidden = !target.hidden;
    app.querySelector('[data-action="choice-hint"]').setAttribute('aria-expanded', String(!target.hidden));
  },
  hint() {
    hint = true;
    mark(first === null ? [] : [first]);
    message('Huruf pertama ditandakan.');
  },
  aid() {
    aid = true;
    document.querySelector('#aid').innerHTML = syllableWord();
    document.querySelector('#aid').hidden = false;
    message('Padankan huruf dengan perkataan yang ditunjukkan.');
  },
  skip() {
    if (activity === 'name') reveal('Dengar dan sebut perkataan ini.', false);
    else choose('', true);
  },
  pick: choose,
  'word-audio'() { playAudio(card.wordAudio); },
  'prompt-audio'() { playAudio(activity === 'words' || promptMode === 'read' ? card.wordAudio : card.promptAudio); },
};

app.addEventListener('submit', event => {
  if (event.target.id !== 'round-settings') return;
  event.preventDefault();
  const settings = new FormData(event.target);
  choiceCount = Number(settings.get('count'));
  promptMode = settings.get('prompt') || 'listen';
  startRound();
});

landscape.addEventListener('change', () => {
  positionPuzzleHeading();
  if (!pointer) return;
  pointer = null;
  mark(first === null ? [] : [first]);
});

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.cell !== undefined) {
    if (event.detail === 0) tapCell(Number(button.dataset.cell));
    return;
  }
  if (button.getAttribute('aria-disabled') === 'true' && button.dataset.action === 'pick') return;
  actions[button.dataset.action]?.(button.dataset.value);
});

function cellAt(event) {
  const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-cell]');
  return cell ? Number(cell.dataset.cell) : null;
}

function focusCell(i) {
  for (const cell of cells) cell.tabIndex = -1;
  cells[i].tabIndex = 0;
  cells[i].focus({preventScroll: true});
}

app.addEventListener('pointerdown', event => {
  const cell = event.target.closest('[data-cell]');
  if (!cell || solved || pointer || !event.isPrimary || event.button !== 0) return;
  const i = Number(cell.dataset.cell);
  focusCell(i);
  cell.setPointerCapture(event.pointerId);
  pointer = {id: event.pointerId, start: i, moved: false};
  event.preventDefault();
});

app.addEventListener('pointermove', event => {
  if (pointer?.id !== event.pointerId) return;
  const end = cellAt(event);
  if (end !== null && end !== pointer.start) pointer.moved = true;
  if (pointer.moved) mark(end === null ? [] : line(gridSize, pointer.start, end), true);
});

app.addEventListener('pointerup', event => {
  if (pointer?.id !== event.pointerId) return;
  const {start, moved} = pointer;
  pointer = null;
  const end = cellAt(event);
  if (end === null) mark(first === null ? [] : [first]);
  else if (moved || start !== end) submit(start, end);
  else tapCell(start);
});

app.addEventListener('pointercancel', event => {
  if (pointer?.id !== event.pointerId) return;
  pointer = null;
  mark(first === null ? [] : [first]);
});

app.addEventListener('keydown', event => {
  const cell = event.target.closest('[data-cell]');
  if (!cell || solved) return;
  const i = Number(cell.dataset.cell);
  const deltas = {ArrowLeft: i % gridSize ? -1 : 0, ArrowRight: i % gridSize < gridSize - 1 ? 1 : 0,
    ArrowUp: -gridSize, ArrowDown: gridSize};
  if (Object.hasOwn(deltas, event.key)) {
    event.preventDefault();
    const next = i + deltas[event.key];
    if (cells[next]) focusCell(next);
  } else if (event.key === 'Escape') {
    first = null;
    mark();
    message('Pilih huruf pertama.');
  }
});

document.querySelector('#home').addEventListener('click', home);
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
});
function updateInstall() {
  if (screen === 'home' && installed()) document.querySelector('#install-area').replaceChildren();
}
window.addEventListener('appinstalled', () => {
  installCompleted = true;
  updateInstall();
});
standalone.addEventListener('change', updateInstall);

function updateConnectivity() {
  document.querySelector('#offline').hidden = navigator.onLine;
}
window.addEventListener('online', updateConnectivity);
window.addEventListener('offline', updateConnectivity);
updateConnectivity();
home();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', {scope: './', type: 'module'}).catch(error => {
    console.warn('Kata Harian: pemasangan luar talian gagal.', error);
  });
}
