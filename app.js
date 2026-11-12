import {cards, rounds} from './data.js';
import {line, makePuzzle} from './puzzle.js';

const app = document.querySelector('#app');
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
let choiceComplete = false;
let chosen = '';
let audio;
let pointer;
let cells = [];

const activityNames = {name: 'Sebut Nama', choose: 'Pilih Gambar'};
const buttons = (action, text, kind = 'secondary', extra = '') =>
  `<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${text}</button>`;

function heading(title, detail = '') {
  return `<header class="section-heading">${detail ? `<p class="context">${detail}</p>` : ''}<h1 tabindex="-1">${title}</h1></header>`;
}

function show(markup) {
  pointer = null;
  cells = [];
  app.innerHTML = markup;
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
  app.querySelector('h1')?.focus({preventScroll: true});
}

function photo(item, label = 'Gambar objek') {
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
    <button class="activity-card" data-action="mode" data-value="name"><span><strong>Sebut Nama</strong><small>Lihat gambar dan cari perkataan.</small></span><span aria-hidden="true">›</span></button>
    <button class="activity-card" data-action="mode" data-value="choose"><span><strong>Pilih Gambar</strong><small>Dengar arahan dan pilih gambar.</small></span><span aria-hidden="true">›</span></button>
  </div>
  <div id="install-area">${installed() ? '' : buttons('install', 'Pasang Aplikasi', 'quiet')}${!installed() ? '<div id="install-help" class="note" hidden></div>' : ''}</div>`);
}

function themes() {
  screen = 'themes';
  show(`${heading('Pilih tema', activityNames[activity])}<div class="menu">${Object.keys(rounds).map(value =>
    buttons('theme', value, 'secondary', `data-value="${value}"`)).join('')}</div>`);
}

function roundMenu() {
  screen = 'rounds';
  show(`${heading('Pilih pusingan', `${activityNames[activity]} · ${theme}`)}
  <div class="menu">${rounds[theme].map((_, i) => buttons('round', `Pusingan ${i + 1} · 5 kad`, 'secondary', `data-value="${i}"`)).join('')}</div>
  ${buttons('themes', 'Tukar tema', 'quiet')}`);
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
  if (activity === 'choose') {
    choices = [...card.distractors];
    const offset = round % (choices.length + 1);
    choices.splice((index + offset) % (choices.length + 1), 0, card.word);
    renderChoice();
  } else renderName();
}

function cardHeading(title) {
  return heading(title, `${activityNames[activity]} · ${theme} · Kad ${index + 1} daripada ${deck.length}`);
}

function answer() {
  return `<div class="answer" id="answer" hidden>
    <div class="answer-line"><span class="answer-word" role="img" aria-label="${card.word}">${card.syllables.map((part, i) =>
      `<span aria-hidden="true" class="${i % 2 === 0 ? 'red' : ''}">${part}</span>`).join('')}</span>
    ${buttons('word-audio', 'Dengar Jawapan', 'secondary', `aria-disabled="${!card.wordAudio}"`)}</div>
    <p class="audio-status" id="audio-status" role="status">${card.wordAudio ? '' : 'Rakaman belum tersedia. Pendamping boleh menyebut jawapan.'}</p>
    ${buttons('next', 'Seterusnya', 'primary')}
  </div>`;
}

function renderName() {
  if (phase === 'photo') {
    show(`${cardHeading('Apa ini?')}<figure class="picture intro-photo">${photo(card)}</figure>
      <div class="actions">${buttons('puzzle', 'Cari Perkataan', 'primary')}</div>`);
    return;
  }

  const fit = card.word.length <= 5;
  const grid = puzzle ? `<div id="puzzle-tools"><p id="grid-help">Seret atau ketik huruf pertama dan terakhir. Papan kekunci: guna anak panah dan Enter.</p>
    <div class="size-row" role="group" aria-label="Saiz petak">
      ${[8, 5].map(size => buttons('size', `${size} × ${size}`, 'size', `data-value="${size}" aria-pressed="${gridSize === size}" ${size === 5 && !fit ? 'disabled aria-describedby="size-help"' : ''}`)).join('')}
      ${fit ? '' : '<p id="size-help">Perkataan ini perlukan petak 8 × 8.</p>'}
    </div></div>
    <div class="grid" id="grid" role="group" aria-label="Petak huruf ${gridSize} darab ${gridSize}" aria-describedby="grid-help" style="--size:${gridSize}">
      ${puzzle.letters.map((letter, i) => `<button type="button" class="cell" data-cell="${i}" tabindex="${i === 0 ? 0 : -1}" aria-label="${letter}, baris ${Math.floor(i / gridSize) + 1}, lajur ${i % gridSize + 1}" aria-pressed="false">${letter}</button>`).join('')}
    </div>` : '';
  show(`${cardHeading('Cari perkataan')}<section class="name-layout">
    <figure class="picture">${photo(card)}</figure>
    <div class="practice">${grid}${answer()}
      <p class="feedback" id="feedback" role="status"></p>
      <div id="puzzle-actions" class="actions wrap">${buttons('hint', 'Petunjuk')}${buttons('aid', 'Tunjuk Perkataan')}${buttons('skip', 'Langkau', 'quiet')}</div>
      <p id="aid" class="aid" hidden>${card.word}</p>
    </div>
  </section>`);
  cells = [...app.querySelectorAll('.cell')];
  if (solved) reveal('Dengar dan sebut perkataan ini.');
}

function renderChoice() {
  show(`${cardHeading('Pilih gambar')}
    <div class="prompt">
      ${buttons('prompt-audio', 'Dengar Arahan', 'primary', `aria-disabled="${!card.promptAudio}"`)}
      <div id="companion" ${card.promptAudio ? 'hidden' : ''}><details><summary>Teks untuk pendamping</summary><p>Bacakan: <strong>Pilih ${card.word}.</strong></p></details></div>
      <p class="audio-status" id="audio-status" role="status">${card.promptAudio ? '' : 'Rakaman belum tersedia.'}</p>
    </div>
    <div class="choices">${choices.map((word, i) => `<button type="button" class="photo-choice" data-action="pick" data-value="${word}" aria-label="Gambar ${i + 1}" aria-pressed="false">${photo(cards[word], '')}</button>`).join('')}</div>
    <p id="feedback" class="feedback" role="status"></p>
    <div class="actions"><div id="choice-next" hidden>${buttons('next', 'Seterusnya', 'primary')}</div>
    <div id="choice-skip">${buttons('skip', 'Langkau', 'quiet')}</div></div>`);
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

function reveal(text) {
  solved = true;
  mark(puzzle?.positions ?? []);
  for (const cell of cells) cell.tabIndex = -1;
  for (const id of ['puzzle-tools', 'puzzle-actions', 'aid']) {
    const el = document.getElementById(id);
    if (el) el.hidden = true;
  }
  document.querySelector('#answer').hidden = false;
  const target = document.querySelector('[data-action="word-audio"]');
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
  for (const button of app.querySelectorAll('.photo-choice')) {
    const active = button.dataset.value === chosen;
    button.classList.toggle('picked', active);
    button.setAttribute('aria-pressed', String(active));
    if (choiceComplete && !button.disabled) button.setAttribute('aria-disabled', 'true');
  }
  message(skipped ? 'Kad dilangkau.' : choiceComplete ? 'Pilihan tepat.' : 'Cuba gambar yang satu lagi.');
  if (choiceComplete) {
    document.querySelector('#choice-skip').hidden = true;
    document.querySelector('#choice-next').hidden = false;
    app.querySelector('[data-action="next"]').focus();
  }
}

function playAudio(url) {
  if (!url) return;
  stopAudio();
  const player = new Audio(url);
  audio = player;
  const status = document.querySelector('#audio-status');
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
  mode(value) { activity = value; themes(); },
  theme(value) { theme = value; roundMenu(); },
  round(value) { round = Number(value); startRound(); },
  replay: startRound,
  'same-round'() { activity = 'choose'; startRound(); },
  puzzle() {
    phase = 'puzzle';
    puzzle = makePuzzle(gridSize, card.word);
    renderName();
  },
  size(value) {
    const size = Number(value);
    if (size === gridSize || card.word.length > size || solved) return;
    selectedSize = gridSize = size;
    first = null;
    puzzle = makePuzzle(size, card.word);
    renderName();
    if (hint) actions.hint();
    if (aid) actions.aid();
    app.querySelector(`[data-action="size"][data-value="${size}"]`).focus();
  },
  hint() {
    hint = true;
    mark(first === null ? [] : [first]);
    message('Huruf pertama ditandakan.');
  },
  aid() {
    aid = true;
    document.querySelector('#aid').hidden = false;
    message('Padankan huruf dengan perkataan yang ditunjukkan.');
  },
  skip() {
    if (activity === 'choose') choose('', true);
    else {
      puzzle = null;
      solved = true;
      renderName();
    }
  },
  pick: choose,
  'word-audio'() { playAudio(card.wordAudio); },
  'prompt-audio'() { playAudio(card.promptAudio); },
};

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
