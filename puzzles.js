'use strict';

const roster = ['Avery','Blake','Casey','Drew','Elliot','Finley','Gray','Harper','Indigo','Jules','Kai','Lane','Morgan','Noel','Parker','Quinn'];

function bitCount(value) {
  let count = 0;
  while (value) {
    value &= value - 1;
    count++;
  }
  return count;
}

function buildCase(level, random = Math.random) {
  const cols = 4;
  const rows = { Quick: 2, Standard: 3, Expert: 4 }[level];
  const count = cols * rows;
  const names = roster.slice();
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  const indices = Array.from({ length: count }, (_, i) => i);
  const order = indices.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const total = count / 2 - (random() < .5 ? 1 : 0);
  const solution = order.slice(0, total).reduce((mask, i) => mask | (1 << i), 0);
  // Mix clue groups independently of the assignment order.
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const suspects = indices.map(i => ({ name: names[i], guilty: Boolean(solution & (1 << i)) }));
  const clues = [];
  const seen = new Set();
  function add(group, label, relation = 'exact') {
    const mask = group.reduce((bits, i) => bits | (1 << i), 0);
    const actual = bitCount(solution & mask);
    const key = relation + ':' + mask;
    if (seen.has(key)) return;
    seen.add(key);
    const text = relation === 'parity'
      ? label + ' has an ' + (actual % 2 ? 'odd' : 'even') + ' number of guilty suspects.'
      : relation === 'mixed'
        ? label + ' includes at least one guilty and one clear suspect.'
        : label + ' has exactly ' + actual + ' guilty ' + (actual === 1 ? 'suspect.' : 'suspects.');
    clues.push({ text, mask, actual, relation, size: group.length });
  }

  for (let r = 0; r < rows; r++) add(indices.filter(i => Math.floor(i / cols) === r), 'Row ' + (r + 1));
  for (let c = 0; c < cols; c++) add(indices.filter(i => i % cols === c), 'Column ' + String.fromCharCode(65 + c));
  // Add overlapping groups so that deductions can cross rows and columns.
  for (let offset = 0; offset < count; offset++) {
    const group = [order[offset], order[(offset + 1) % count], order[(offset + 3) % count]];
    const actual = group.filter(i => suspects[i].guilty).length;
    const relation = level !== 'Quick' && offset % 3 === 0 ? 'parity'
      : level === 'Expert' && offset % 3 === 1 && actual > 0 && actual < 3 ? 'mixed' : 'exact';
    if (level !== 'Quick' && relation === 'exact' && (actual === 0 || actual === 3)) continue;
    add(group, 'The group with ' + group.map(i => names[i]).join(', '), relation);
  }

  const matches = (mask, clue) => {
    const value = bitCount(mask & clue.mask);
    if (clue.relation === 'parity') return value % 2 === clue.actual % 2;
    if (clue.relation === 'mixed') return value > 0 && value < clue.size;
    return value === clue.actual;
  };
  const alternatives = [];
  for (let mask = 0; mask < (1 << count); mask++) {
    if (mask !== solution && bitCount(mask) === total) alternatives.push(mask);
  }
  // A reserve of pair clues guarantees uniqueness. Remove redundant clues
  // afterward, trying direct clues first so the final board favors inference.
  let remaining = alternatives.filter(mask => clues.every(clue => matches(mask, clue)));
  for (let i = 0; remaining.length && i < count; i++) {
    for (let j = i + 1; remaining.length && j < count; j++) {
      const group = [i, j];
      const label = 'The pair ' + names[i] + ' and ' + names[j];
      add(group, label, 'parity');
      remaining = remaining.filter(mask => matches(mask, clues.at(-1)));
    }
  }
  // Pair parity can leave complementary solutions when both have the same total.
  if (remaining.length) add([order[0]], 'The group containing only ' + names[order[0]]);
  for (let i = clues.length - 1; i >= 0; i--) {
    const [removed] = clues.splice(i, 1);
    if (alternatives.some(mask => clues.every(clue => matches(mask, clue)))) clues.splice(i, 0, removed);
  }
  return { cols, suspects, clues, total };
}

function logicGame(panel, signal) {
  const { find, on } = setup(panel, signal, `
  <div class="logic"><div class="toolbar"><label>Case size<select id="level"><option>Quick</option><option selected>Standard</option><option>Expert</option></select></label><button class="primary" id="new">New case</button><button class="secondary" id="hint">Reveal one suspect</button></div>
  <div class="stats"><span>Marked <b id="progress"></b></span><span>Guilty total <b id="total"></b></span><span>Hints <b id="hints">0</b></span></div>
  <div class="lineup-layout"><div><div class="logic-board" role="group" aria-label="Suspects"></div>
  <div class="toolbar"><button class="secondary" id="clear">Clear</button><button class="secondary" id="guilty">Guilty</button><button class="secondary" id="unknown">Unmark</button><button class="primary" id="check">Check deductions</button></div>
  <p class="status" role="status"></p></div>
  <section><h2>Case notes</h2><ol class="clues"></ol></section></div>
  <p class="instructions">Combine clues across rows, columns and named groups. All clues are true. Your marks are guesses until you check the complete board. An even count can be zero.</p></div>`);
  const board = find('.logic-board');
  const status = find('.status');
  let puzzle, marks, selected, hints, won;

  function render() {
    board.querySelectorAll('[data-index]').forEach(button => {
      const i = Number(button.dataset.index);
      button.dataset.state = marks[i];
      button.disabled = won;
      button.setAttribute('aria-pressed', String(selected === i));
      button.lastElementChild.textContent = marks[i] === 'unknown' ? 'Unmarked' : marks[i] === 'guilty' ? 'Guilty' : 'Clear';
    });
    const marked = marks.filter(mark => mark !== 'unknown').length;
    find('#progress').textContent = marked + ' / ' + marks.length;
    find('#hints').textContent = hints;
    find('#clear').disabled = find('#guilty').disabled = find('#unknown').disabled = selected === null || won;
    find('#check').disabled = marked !== marks.length || won;
    find('#hint').disabled = won || marked === marks.length;
  }

  function newCase() {
    puzzle = buildCase(find('#level').value);
    marks = Array(puzzle.suspects.length).fill('unknown');
    selected = null;
    hints = 0;
    won = false;
    const labels = ['<span></span>', ...'ABCD'.split('').map(letter => '<b class="grid-label">' + letter + '</b>')];
    puzzle.suspects.forEach((suspect, i) => {
      if (i % puzzle.cols === 0) labels.push('<b class="grid-label">' + (i / puzzle.cols + 1) + '</b>');
      labels.push(`<button class="suspect" type="button" data-index="${i}"><strong>${suspect.name}</strong><span></span></button>`);
    });
    board.innerHTML = labels.join('');
    find('#total').textContent = puzzle.total;
    find('.clues').innerHTML = puzzle.clues.map(clue => '<li>' + clue.text + '</li>').join('');
    status.textContent = 'Compare the clues to start your deductions.';
    render();
  }

  function classify(mark) {
    if (selected === null || won) return;
    marks[selected] = mark;
    render();
  }

  on(board, 'click', event => {
    const button = event.target.closest('[data-index]');
    if (!button || won) return;
    selected = Number(button.dataset.index);
    render();
  });
  on(find('#hint'), 'click', () => {
    selected = marks.indexOf('unknown');
    if (selected < 0 || won) return;
    const suspect = puzzle.suspects[selected];
    hints++;
    classify(suspect.guilty ? 'guilty' : 'clear');
    status.textContent = 'Hint: ' + suspect.name + ' is ' + marks[selected] + '.';
  });
  on(find('#check'), 'click', () => {
    if (marks.includes('unknown') || won) return;
    won = puzzle.suspects.every((suspect, i) => suspect.guilty === (marks[i] === 'guilty'));
    status.textContent = won ? 'Case closed. Every suspect is accounted for.' : 'Your lineup conflicts with at least one clue. Review the case notes and revise your marks.';
    render();
    if (won) find('#new').focus();
  });
  on(find('#clear'), 'click', () => classify('clear'));
  on(find('#guilty'), 'click', () => classify('guilty'));
  on(find('#unknown'), 'click', () => classify('unknown'));
  on(find('#new'), 'click', newCase);
  on(find('#level'), 'change', newCase);
  newCase();
}

function passwordRules(challenge) {
  const { word, code, digitSum, seal } = challenge;
  const count = (s, pattern) => (s.match(pattern) || []).length;
  const digit = digitSum - Number(code[0]) - Number(code[1]);
  const reversed = [...word].reverse().join('');
  return [
    ['Use at least eight characters.', s => s.length >= 8],
    ['Include a lowercase letter.', s => /[a-z]/.test(s)],
    ['Include an uppercase letter.', s => /[A-Z]/.test(s)],
    ['Include a digit.', s => /\d/.test(s)],
    ['Include an exclamation mark.', s => s.includes('!')],
    ['Include the word “' + word + '” in lowercase.', s => s.includes(word)],
    ['Make all your digits add up to ' + digitSum + '.', s => (s.match(/\d/g) || []).reduce((sum, d) => sum + Number(d), 0) === digitSum],
    ['Include the arcade code for this round: ' + code + '.', s => s.includes(code)],
    ['Put exactly two exclamation marks anywhere in the password.', s => (s.match(/!/g) || []).length === 2],
    ['Put a lowercase letter inside square brackets, like [a].', s => /\[[a-z]\]/.test(s)],
    ['Include the seal “' + seal + '” with matching capitalization.', s => s.includes(seal)],
    ['Start and end with the same uppercase letter.', s => /^[A-Z]/.test(s) && s[0] === s.at(-1)],
    ['Use exactly three digits in the entire password.', s => (s.match(/\d/g) || []).length === 3],
    ['Put exactly one hyphen before the arcade code.', s => s.includes('-' + code) && (s.match(/-/g) || []).length === 1],
    ['Add “mirror” spelled backward, using lowercase.', s => s.includes('rorrim')],
    ['Separate two parts with a vertical bar (|).', s => s.includes('|')],
    ['Put the reverse of “' + word + '” immediately after the bar.', s => s.includes('|' + reversed)],
    ['End the reversed word with a colon.', s => s.includes('|' + reversed + ':')],
    ['After the colon, add the first and last letters of the round word in uppercase.', s => s.includes(':' + (word[0] + word.at(-1)).toUpperCase())],
    ['Add a forward slash followed by “blue”.', s => s.includes('/blue')],
    ['Follow “blue” with a plus sign and the word “sun”.', s => s.includes('/blue+sun')],
    ['Link “sun” and “moon” with an underscore.', s => s.includes('sun_moon')],
    ['There should be exactly one bar, one colon, and one slash.', s => count(s, /[|]/g) === 1 && count(s, /:/g) === 1 && count(s, /[/]/g) === 1],
    ['The third digit must come immediately after the arcade code.', s => s.includes(code + digit)],
    ['Use the letter immediately after the round word’s first letter inside the brackets.', s => s.includes('[' + String.fromCharCode(word.charCodeAt(0) + 1) + ']')],
    ['Place the seal immediately after the closing bracket.', s => s.includes(']' + seal)],
    ['Put the two exclamation marks next to each other.', s => s.includes('!!')],
    ['Put the exclamation pair directly after the original lowercase round word.', s => s.includes(word + '!!')],
    ['Start with the first letter of the seal.', s => s[0] === seal[0]],
    ['Put an equals sign after “moon”.', s => s.includes('moon=')],
    ['Follow that equals sign with “star”.', s => s.includes('moon=star')],
    ['After “star”, use a tilde (~) and the word “end”.', s => s.includes('star~end')],
    ['Add @ followed by the seal written in lowercase.', s => s.includes('@' + seal.toLowerCase())],
    ['After the lowercase seal, add # and the word “go”.', s => s.includes('@' + seal.toLowerCase() + '#go')],
    ['Join “go” and “win” with a percent sign.', s => s.includes('go%win')],
    ['Join “win” and “play” with an ampersand.', s => s.includes('win&play')],
    ['The password must have at least 60 characters.', s => s.length >= 60],
    ['After “play”, add an asterisk and “fin”.', s => s.includes('play*fin')],
    ['Use a semicolon to connect “fin” and “yes”.', s => s.includes('fin;yes')],
    ['Use a comma to connect “yes” and “ok”.', s => s.includes('yes,ok')],
    ['Put a period between “ok” and the final uppercase letter.', s => s.endsWith('ok.' + seal[0])],
    ['Include exactly one opening bracket and one closing bracket.', s => count(s, /\[/g) === 1 && count(s, /\]/g) === 1],
    ['Use exactly one plus sign and one equals sign.', s => count(s, /\+/g) === 1 && count(s, /=/g) === 1],
    ['The round word should begin immediately after the first uppercase letter.', s => s.startsWith(seal[0] + word)],
    ['Keep the arcade code directly after the uppercase seal and its hyphen.', s => s.includes(seal + '-' + code)],
    ['Put the backward spelling of “mirror” directly after the three digits.', s => s.includes(code + digit + 'rorrim')],
    ['Put the bar directly after the backward spelling of “mirror”.', s => s.includes('rorrim|')],
    ['There must be exactly seven uppercase letters, including the first and last.', s => count(s, /[A-Z]/g) === 7],
    ['Use exactly one period and exactly one comma.', s => count(s, /\./g) === 1 && count(s, /,/g) === 1],
    ['Use an even number of characters overall. If needed, insert a spare lowercase letter between the exclamation pair and the opening bracket.', s => s.length % 2 === 0]
  ];
}

function passwordGame(panel, signal) {
  const { find, on } = setup(panel, signal, `
  <div class="password"><div class="toolbar"><label>Rule count<select id="length"><option value="15">Quick · 15</option><option value="30">Standard · 30</option><option value="50" selected>Expert · 50</option></select></label><button class="primary" id="new">New challenge</button></div>
  <div class="stats"><span>Rules passed <b id="progress"></b></span><span>Characters <b id="characters">0</b></span></div>
  <label for="password-entry">Invent a password</label><input id="password-entry" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="256" aria-describedby="password-tip">
  <p class="instructions" id="password-tip">Use made-up text. The game checks it in your browser as you type.</p>
  <p class="status" role="status">Rule 1 is ready.</p><ol class="rules"></ol>
  <p class="credit">An original rule set inspired by <cite>The Password Game</cite> by Neal Agarwal.</p></div>`);
  const input = find('#password-entry');
  const ruleList = find('.rules');
  let rules, revealed;

  function render() {
    const passed = rules.map(([, validate]) => validate(input.value));
    while (revealed < rules.length && passed.slice(0, revealed).every(Boolean)) revealed++;
    const count = passed.slice(0, revealed).filter(Boolean).length;
    find('#progress').textContent = count + ' / ' + rules.length;
    find('#characters').textContent = Array.from(input.value).length;
    ruleList.innerHTML = rules.slice(0, revealed).map(([message], i) =>
      `<li class="${passed[i] ? 'good' : ''}"><b>${passed[i] ? '✓ Passed' : '○ To do'} · Rule ${i + 1}</b><br>${message}</li>`
    ).reverse().join('');
    const nextStatus = count === rules.length ? 'Challenge complete. Every rule is satisfied!' : 'Rule ' + revealed + ' is open.';
    if (find('.status').textContent !== nextStatus) find('.status').textContent = nextStatus;
  }

  function reset() {
    const samples = [
      { word: 'lemon', code: '27', digitSum: 14, seal: 'RBC' },
      { word: 'comet', code: '43', digitSum: 13, seal: 'POP' },
      { word: 'pixel', code: '18', digitSum: 16, seal: 'ZIP' },
      { word: 'mango', code: '62', digitSum: 12, seal: 'JOY' }
    ];
    rules = passwordRules(samples[Math.floor(Math.random() * samples.length)]).slice(0, Number(find('#length').value));
    revealed = 1;
    input.value = '';
    render();
  }

  on(input, 'input', render);
  on(find('#new'), 'click', () => { reset(); input.focus(); });
  on(find('#length'), 'change', reset);
  reset();
}
