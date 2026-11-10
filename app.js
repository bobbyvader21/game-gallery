'use strict';

const games = [
  ['snake', 'Snake', 'ARCADE', 'Grab the fruit. Grow the tail. Dodge yourself.', '#d8f4e2',
    '<path d="M22 63h30V42h24V21h25" fill="none" stroke="#176a48" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/><circle cx="101" cy="21" r="2" fill="white"/><circle cx="101" cy="58" r="8" fill="#eb6647"/>', snakeGame],
  ['2048', '2048', 'NUMBER PUZZLE', 'Slide matching tiles together and build your way to 2048.', '#fff0b0',
    '<rect x="21" y="13" width="43" height="43" rx="7" fill="#ffc907"/><rect x="68" y="31" width="45" height="43" rx="7" fill="#fca945"/><text x="43" y="41" text-anchor="middle">2</text><text x="91" y="59" text-anchor="middle">4</text>', tileGame],
  ['tetris', 'Tetris', 'ARCADE', 'Rotate falling blocks and clear rows before the stack reaches the top.', '#dcefff',
    '<path d="M37 18h54v18H73v18H55V36H37z" fill="#2e9df7"/><path d="M73 57h36v18H73zM21 40h18v18h18v17H21z" fill="#1c5889"/>', tetrisGame],
  ['logic', 'The Lineup', 'DEDUCTION', 'Read the clues and work out who’s guilty and who’s clear.', '#e9e2fb',
    '<rect x="23" y="16" width="85" height="55" rx="9" fill="#fff" stroke="#6651a1" stroke-width="3"/><path d="m33 34 6 6 10-12m-16 27 6 6 10-12m10-13h36m-36 21h26" fill="none" stroke="#6651a1" stroke-width="3" stroke-linecap="round"/>', logicGame],
  ['password', 'The Password Game', 'RULE PUZZLE', 'Build a made-up password that survives a growing list of odd rules.', '#ffe8db',
    '<rect x="17" y="24" width="97" height="38" rx="9" fill="#fff" stroke="#9d4934" stroke-width="3"/><text x="65" y="53" text-anchor="middle">✱✱✱</text>', passwordGame]
];

const home = document.getElementById('home');
const room = document.getElementById('room');
const panel = document.getElementById('game');
const title = document.getElementById('game-title');
let active;
let scope;

document.getElementById('cards').innerHTML = games.map(([id, name, genre, description, color, art]) =>
  `<a class="card" href="#${id}"><div class="card-art" style="--accent:${color}"><svg viewBox="0 0 130 82" aria-hidden="true" font-family="inherit" font-size="24" font-weight="900" fill="#172d40">${art}</svg></div><div class="card-body"><small>${genre}</small><h3>${name}</h3><p>${description}</p><strong>Play game →</strong></div></a>`
).join('');

function route() {
  const entry = games.find(game => '#' + game[0] === location.hash);
  if (active === entry?.[0]) return;
  scope?.abort();
  active = entry?.[0];
  room.hidden = !entry;
  home.hidden = !!entry;
  if (!entry) {
    const firstCard = home.querySelector('.card');
    firstCard.focus({ preventScroll: true });
    document.getElementById('games').scrollIntoView();
    return;
  }
  scope = new AbortController();
  const [id, name, genre, description, , , mount] = entry;
  document.getElementById('genre').textContent = genre;
  title.textContent = name;
  document.getElementById('game-description').textContent = description;
  panel.replaceChildren();
  mount(panel, scope.signal);
  title.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function setup(panel, signal, markup, keyAction) {
  panel.innerHTML = markup;
  const find = selector => panel.querySelector(selector);
  const on = (element, event, callback) => element.addEventListener(event, callback, { signal });
  if (keyAction) {
    on(document, 'keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,select,textarea')) return;
      if (event.code === 'Space' && event.target.closest('button,a')) return;
      if (keyAction(event)) event.preventDefault();
    });
    for (const button of panel.querySelectorAll('[data-key]')) {
      on(button, 'click', () => keyAction({ code: button.dataset.key, repeat: false }));
    }
  }
  return { find, on };
}

function readBest(id) {
  try { return Math.max(0, Number(localStorage.getItem('aycp-best-' + id)) || 0); }
  catch { return 0; }
}

function saveBest(id, score) {
  try { localStorage.setItem('aycp-best-' + id, String(score)); }
  catch { /* Scores still work for the current page. */ }
}

function record(id, score, element) {
  const best = Math.max(score, Number(element.textContent), readBest(id));
  element.textContent = best;
  if (best > readBest(id)) saveBest(id, best);
}

function buttons(entries) {
  return '<div class="pad" aria-label="On-screen controls">' + entries.map(([key, label, icon]) =>
    `<button type="button" class="secondary" data-key="${key}" aria-label="${label}">${icon || label}</button>`
  ).join('') + '</div>';
}

const arrows = [
  ['ArrowLeft', 'Left', '←'], ['ArrowUp', 'Up', '↑'],
  ['ArrowDown', 'Down', '↓'], ['ArrowRight', 'Right', '→']
];

function directions(code) {
  return { ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowRight: [1, 0] }[code];
}

addEventListener('hashchange', route);
route();
