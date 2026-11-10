'use strict';

function snakeGame(panel, signal) {
  const { find, on } = setup(panel, signal, `
  <div class="arcade"><div class="toolbar"><label>Speed<select id="speed"><option>Easy</option><option selected>Normal</option><option>Hard</option></select></label><button class="primary" id="start">Start</button><button class="secondary" id="pause" disabled>Pause</button></div>
  <div class="stats"><span>Score <b id="score">0</b></span><span>Best <b id="best">0</b></span></div>
  <canvas width="400" height="400" aria-label="Snake board"></canvas><p class="status" role="status"></p>
  ${buttons(arrows)}<p class="instructions">Use arrows or the on-screen buttons. Press P to pause. Changing speed starts a fresh board.</p></div>`, key);
  const board = find('canvas').getContext('2d');
  const size = 20;
  const speed = find('#speed');
  const start = find('#start');
  const pause = find('#pause');
  const status = find('.status');
  const delays = { Easy: 165, Normal: 115, Hard: 78 };
  let snake, fruit, heading, next, score, state, timer;

  function placeFruit() {
    const open = [];
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!snake.some(part => part[0] === x && part[1] === y)) open.push([x, y]);
      }
    }
    return open[Math.floor(Math.random() * open.length)];
  }

  function draw() {
    board.fillStyle = '#152e43';
    board.fillRect(0, 0, 400, 400);
    board.fillStyle = '#1e3a50';
    for (let x = 0; x < size; x++) {
      for (let y = x % 2; y < size; y += 2) board.fillRect(x * 20, y * 20, 20, 20);
    }
    if (fruit) {
      const x = fruit[0] * 20 + 10, y = fruit[1] * 20 + 10;
      const shine = board.createRadialGradient(x - 3, y - 3, 1, x, y, 9);
      shine.addColorStop(0, '#ffe890');
      shine.addColorStop(.5, '#ff8050');
      shine.addColorStop(1, '#d63645');
      board.fillStyle = shine;
      board.beginPath();
      board.arc(x, y + 1, 8, 0, Math.PI * 2);
      board.fill();
      board.fillStyle = '#a5ed82';
      board.beginPath();
      board.ellipse(x + 3, y - 7, 4, 2, -.55, 0, Math.PI * 2);
      board.fill();
    }
    const centers = snake.map(([x, y]) => [x * 20 + 10, y * 20 + 10]);
    function bodyStroke(color, width, offset) {
      board.strokeStyle = color;
      board.lineWidth = width;
      board.lineJoin = board.lineCap = 'round';
      board.beginPath();
      centers.forEach(([x, y], i) => i ? board.lineTo(x, y + offset) : board.moveTo(x, y + offset));
      board.stroke();
    }
    bodyStroke('#0a2230', 18, 2);
    bodyStroke('#2bbf82', 14, 0);
    bodyStroke('#61e6a1', 7, -2);
    const [x, y] = centers[0];
    board.save();
    board.translate(x, y);
    board.rotate(Math.atan2(heading[1], heading[0]));
    board.fillStyle = '#a6f6ad';
    board.beginPath();
    board.ellipse(1, 0, 10, 8, 0, 0, Math.PI * 2);
    board.fill();
    for (const eye of [-4, 4]) {
      board.fillStyle = '#fff';
      board.beginPath();
      board.arc(4, eye, 2.4, 0, Math.PI * 2);
      board.fill();
      board.fillStyle = '#123345';
      board.beginPath();
      board.arc(4.8, eye, 1.2, 0, Math.PI * 2);
      board.fill();
    }
    board.restore();
  }

  function reset() {
    clearInterval(timer);
    snake = [[8, 10], [7, 10], [6, 10]];
    heading = next = [1, 0];
    fruit = [13, 10];
    score = 0;
    state = 'ready';
    start.textContent = 'Start';
    pause.textContent = 'Pause';
    pause.disabled = true;
    find('#best').textContent = readBest('snake-' + speed.value);
    find('#score').textContent = '0';
    status.textContent = 'Ready to play.';
    draw();
  }

  function begin() {
    reset();
    state = 'running';
    status.textContent = 'Go!';
    start.textContent = 'Restart';
    pause.disabled = false;
    timer = setInterval(tick, delays[speed.value]);
  }

  function finish(message) {
    clearInterval(timer);
    state = 'over';
    pause.disabled = true;
    start.textContent = 'Play again';
    status.textContent = message + ' Score: ' + score + '.';
  }

  function tick() {
    heading = next;
    const x = snake[0][0] + heading[0];
    const y = snake[0][1] + heading[1];
    const eats = x === fruit[0] && y === fruit[1];
    const body = eats ? snake : snake.slice(0, -1);
    if (x < 0 || x >= size || y < 0 || y >= size ||
      body.some(part => part[0] === x && part[1] === y)) {
      finish('Game over.');
      return;
    }
    snake.unshift([x, y]);
    if (eats) {
      find('#score').textContent = ++score;
      record('snake-' + speed.value, score, find('#best'));
      fruit = placeFruit();
      if (!fruit) finish('You filled the board!');
    } else snake.pop();
    draw();
  }

  function togglePause() {
    if (state === 'running') {
      clearInterval(timer);
      state = 'paused';
      pause.textContent = 'Resume';
      status.textContent = 'Paused.';
    } else if (state === 'paused') {
      state = 'running';
      pause.textContent = 'Pause';
      status.textContent = 'Go!';
      timer = setInterval(tick, delays[speed.value]);
    }
  }

  function key(event) {
    if (event.code === 'KeyP') {
      if (!event.repeat) togglePause();
      return true;
    }
    const direction = directions(event.code);
    if (!direction) return false;
    if (state === 'running' && direction[0] * heading[0] + direction[1] * heading[1] === 0) next = direction;
    return true;
  }

  on(start, 'click', begin);
  on(pause, 'click', togglePause);
  on(speed, 'change', reset);
  on(document, 'visibilitychange', () => { if (document.hidden && state === 'running') togglePause(); });
  signal.addEventListener('abort', () => clearInterval(timer));
  reset();
}

// Process from the leading edge. Each starting tile moves at most once.
function stepTiles(cells, size, dx, dy) {
  const output = cells.slice();
  const moves = [];
  const merged = new Set();
  let points = 0;
  for (let offset = 0; offset < size; offset++) {
    const position = dx > 0 || dy > 0 ? size - offset - 1 : offset;
    for (let lane = 0; lane < size; lane++) {
      const x = dx ? position : lane, y = dy ? position : lane;
      const from = y * size + x;
      const value = cells[from];
      if (!value || x + dx < 0 || x + dx >= size || y + dy < 0 || y + dy >= size) continue;
      const to = (y + dy) * size + x + dx;
      if (output[to] && (output[to] !== value || merged.has(to))) continue;
      if (output[to]) {
        points += value * 2;
        merged.add(to);
      }
      output[to] += value;
      output[from] = 0;
      moves.push({ from, to });
    }
  }
  return { output, moves, merged, points };
}

function spawnTile(cells, random = Math.random) {
  const open = cells.flatMap((value, index) => value ? [] : [index]);
  if (!open.length) return -1;
  const index = open[Math.floor(random() * open.length)];
  cells[index] = random() < .9 ? 2 : 4;
  return index;
}


function takeTileTurn(cells, size, dx, dy, random = Math.random) {
  const turn = stepTiles(cells, size, dx, dy);
  if (!turn.moves.length) return null;
  return { ...turn, spawned: spawnTile(turn.output, random) };
}

function tileGame(panel, signal) {
  const { find, on } = setup(panel, signal, `
  <div class="arcade"><div class="toolbar"><label>Board size<select id="size"><option value="3">3 × 3</option><option value="4" selected>4 × 4</option><option value="5">5 × 5</option></select></label><button class="primary" id="reset">New game</button><button class="secondary" id="undo" disabled>Undo</button></div>
  <div class="stats"><span>Score <b id="score">0</b></span><span>Best <b id="best">0</b></span></div>
  <div class="tiles" role="group" aria-label="2048 board"></div><p class="status" role="status"></p>
  ${buttons(arrows)}<p class="instructions">Swipe the board, use arrow keys, or tap the directional buttons. Each input nudges tiles one square. Match tiles to reach 2048, then keep going.</p></div>`, event => {
    const direction = directions(event.code);
    if (!direction) return false;
    move(...direction);
    return true;
  });
  const board = find('.tiles');
  const sizeSelect = find('#size');
  const undo = find('#undo');
  let size, cells, score, previous, reached;
  let pointer;
  let animationFrame = 0;
  let animating = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

  function render(merged = new Set(), spawned = -1) {
    board.style.setProperty('--size', size);
    const colors = ['#e7eef4','#fff1b3','#ffd972','#ffbc60','#ffa17c','#9de0fb','#74c9f9','#72dda9','#c5aff8'];
    board.innerHTML = cells.map((value, i) => {
      const color = colors[value ? Math.min(Math.log2(value), 8) : 0];
      return `<div class="tile${merged.has(i) ? ' tile-merge' : i === spawned ? ' tile-spawn' : ''}" style="background:${color}" aria-label="${value || 'Empty'}">${value || ''}</div>`;
    }).join('');
    find('#score').textContent = score;
    undo.disabled = !previous;
  }

  function reset() {
    clearTimeout(animationFrame);
    animating = false;
    pointer = null;
    size = Number(sizeSelect.value);
    cells = Array(size * size).fill(0);
    score = 0;
    previous = null;
    reached = false;
    find('#best').textContent = readBest('2048-' + size);
    find('.status').textContent = 'Ready to slide.';
    spawnTile(cells);
    spawnTile(cells);
    render();
  }

  function hasMoves() {
    return cells.some((value, index) => !value ||
      (index % size < size - 1 && cells[index + 1] === value) || cells[index + size] === value);
  }

  function move(dx, dy) {
    if (animating) return;
    const turn = takeTileTurn(cells, size, dx, dy);
    if (!turn) {
      if (hasMoves()) find('.status').textContent = 'Blocked. No tile added.';
      return;
    }
    const { output, moves, merged, points, spawned } = turn;
    previous = { cells, score, reached };
    cells = output;
    score += points;
    const won = !reached && cells.includes(2048);
    reached ||= won;
    const available = hasMoves();
    function finishAnimation() {
      find('.status').textContent = won ? 'You reached 2048!' : available ? (points ? '+' + points + ' points' : 'Tile moved.') : 'No moves left. Undo or start a new game.';
      record('2048-' + size, score, find('#best'));
      animating = false;
      render(merged, spawned);
    }
    if (motion.matches || !Element.prototype.animate) {
      finishAnimation();
      return;
    }
    animating = true;
    undo.disabled = true;
    const tiles = Array.from(board.children);
    const positions = tiles.map(tile => tile.getBoundingClientRect());
    for (const { from, to } of moves) {
      const tile = tiles[from];
      const x = positions[to].left - positions[from].left;
      const y = positions[to].top - positions[from].top;
      tile.style.zIndex = '2';
      tile.animate([{ transform: 'translate(0, 0)' }, { transform: `translate(${x}px, ${y}px)` }],
        { duration: 125, easing: 'cubic-bezier(.25,.75,.25,1)', fill: 'forwards' });
    }
    animationFrame = setTimeout(finishAnimation, 125);
  }

  on(find('#reset'), 'click', reset);
  on(sizeSelect, 'change', reset);
  on(undo, 'click', () => {
    if (!previous || animating) return;
    ({ cells, score, reached } = previous);
    previous = null;
    find('.status').textContent = 'Last move undone.';
    render();
  });
  signal.addEventListener('abort', () => clearTimeout(animationFrame));
  on(board, 'pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = [event.clientX, event.clientY];
    board.setPointerCapture(event.pointerId);
  });
  on(board, 'pointercancel', () => { pointer = null; });
  on(board, 'pointerup', event => {
    if (!event.isPrimary || !pointer) return;
    const dx = event.clientX - pointer[0];
    const dy = event.clientY - pointer[1];
    pointer = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(Math.sign(dx), 0);
    else move(0, Math.sign(dy));
  });
  reset();
}

const tetrominoes = [
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  [[2,2],[2,2]],
  [[0,3,0],[3,3,3],[0,0,0]],
  [[0,4,4],[4,4,0],[0,0,0]],
  [[5,5,0],[0,5,5],[0,0,0]],
  [[6,0,0],[6,6,6],[0,0,0]],
  [[0,0,7],[7,7,7],[0,0,0]]
];

function rotatePiece(matrix) {
  return matrix.map((row, y) => row.map((_, x) => matrix[matrix.length - 1 - x][y]));
}

function tetrisGame(panel, signal) {
  const controls = [arrows[0], arrows[3], ['ArrowUp','Rotate','↻'], ['ArrowDown','Soft drop','↓'], ['Space','Hard drop','Drop']];
  const { find, on } = setup(panel, signal, `
  <div class="arcade"><div class="toolbar"><label>Starting speed<select id="speed"><option>Easy</option><option selected>Normal</option><option>Hard</option></select></label><button class="primary" id="start">Start</button><button class="secondary" id="pause" disabled>Pause</button></div>
  <div class="stats"><span>Score <b id="score">0</b></span><span>Best <b id="best">0</b></span><span>Lines <b id="lines">0</b></span><span>Next <b id="next">–</b></span></div>
  <canvas class="tetris" width="250" height="500" aria-label="Tetris board"></canvas><p class="status" role="status"></p>
  ${buttons(controls)}<p class="instructions">Use ←/→ to move, ↑ to rotate, ↓ to lower, and Space to drop. Press P to pause. You can also use the on-screen controls.</p></div>`, key);
  const canvas = find('canvas');
  const ctx = canvas.getContext('2d');
  const speed = find('#speed');
  const pause = find('#pause');
  const start = find('#start');
  const status = find('.status');
  const colors = ['','#3abafa','#ffcc15','#bc9bfa','#5ce6a4','#ff7866','#779fff','#ffab58'];
  const names = ['I','O','T','S','Z','J','L'];
  const delay = { Easy: 850, Normal: 610, Hard: 390 };
  const width = 10, height = 20;
  let board, piece, next, bag, score, lines, state, timer;

  function drawBlock(x, y, value, ghost) {
    if (y < 0) return;
    if (ghost) {
      ctx.strokeStyle = colors[value];
      ctx.globalAlpha = .6;
      ctx.strokeRect(x * 25 + 3, y * 25 + 3, 19, 19);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = colors[value];
      ctx.fillRect(x * 25 + 1, y * 25 + 1, 23, 23);
    }
  }

  function visit(matrix, callback) {
    matrix.forEach((row, y) => row.forEach((value, x) => {
      if (value) callback(x, y, value);
    }));
  }

  function fits(matrix, x, y) {
    let valid = true;
    visit(matrix, (px, py) => {
      const col = x + px, row = y + py;
      if (col < 0 || col >= width || row >= height || (row >= 0 && board[row][col])) valid = false;
    });
    return valid;
  }

  function draw() {
    ctx.fillStyle = '#152e43';
    ctx.fillRect(0, 0, 250, 500);
    ctx.fillStyle = '#1d3a50';
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) ctx.fillRect(x * 25 + 1, y * 25 + 1, 23, 23);
    }
    visit(board, (x, y, value) => drawBlock(x, y, value, false));
    if (!piece || state === 'over') return;
    let landing = piece.y;
    while (fits(piece.matrix, piece.x, landing + 1)) landing++;
    visit(piece.matrix, (x, y, value) => drawBlock(piece.x + x, landing + y, value, true));
    visit(piece.matrix, (x, y, value) => drawBlock(piece.x + x, piece.y + y, value, false));
  }

  function pull() {
    if (!bag.length) {
      bag = names.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    return bag.pop();
  }

  function hud() {
    find('#score').textContent = score;
    find('#lines').textContent = lines;
    find('#next').textContent = next === undefined ? '–' : names[next];
    record('tetris-' + speed.value, score, find('#best'));
  }

  function reset() {
    clearTimeout(timer);
    board = Array.from({ length: height }, () => Array(width).fill(0));
    piece = next = undefined;
    bag = [];
    score = lines = 0;
    state = 'ready';
    start.textContent = 'Start';
    pause.textContent = 'Pause';
    pause.disabled = true;
    status.textContent = 'Ready to stack.';
    find('#best').textContent = readBest('tetris-' + speed.value);
    hud();
    draw();
  }

  function end() {
    state = 'over';
    clearTimeout(timer);
    pause.disabled = true;
    start.textContent = 'Play again';
    status.textContent = 'Game over. Score: ' + score + '.';
  }

  function spawn() {
    const matrix = tetrominoes[next];
    piece = { matrix, x: Math.floor((width - matrix.length) / 2), y: -1 };
    next = pull();
    if (!fits(matrix, piece.x, piece.y)) end();
  }

  function schedule() {
    clearTimeout(timer);
    if (state === 'running') timer = setTimeout(() => {
      lower(false);
      draw();
      schedule();
    }, Math.max(90, delay[speed.value] - Math.floor(lines / 8) * 65));
  }

  function lock() {
    let above = false;
    visit(piece.matrix, (x, y, value) => {
      const row = piece.y + y;
      if (row < 0) above = true;
      else board[row][piece.x + x] = value;
    });
    if (above) { end(); return; }
    board = board.filter(row => !row.every(Boolean));
    const count = height - board.length;
    while (board.length < height) board.unshift(Array(width).fill(0));
    lines += count;
    score += [0,100,300,500,800][count];
    if (count) status.textContent = 'Cleared ' + count + (count === 1 ? ' line!' : ' lines!');
    spawn();
    hud();
    schedule();
  }

  function lower(manual) {
    if (fits(piece.matrix, piece.x, piece.y + 1)) {
      piece.y++;
      if (manual) { score++; hud(); }
    } else lock();
  }

  function togglePause() {
    if (state === 'running') {
      state = 'paused';
      clearTimeout(timer);
      pause.textContent = 'Resume';
      status.textContent = 'Paused.';
    } else if (state === 'paused') {
      state = 'running';
      pause.textContent = 'Pause';
      status.textContent = 'Stacking.';
      schedule();
    }
  }

  function key(event) {
    if (event.code === 'KeyP') {
      if (!event.repeat) togglePause();
      return true;
    }
    if (!directions(event.code) && event.code !== 'Space') return false;
    if (state !== 'running') return true;
    if (event.code === 'ArrowUp' && !event.repeat) {
      const rotated = rotatePiece(piece.matrix);
      const kick = [0,-1,1,-2,2].find(offset => fits(rotated, piece.x + offset, piece.y));
      if (kick !== undefined) {
        piece.matrix = rotated;
        piece.x += kick;
      }
    } else if (event.code === 'ArrowDown') {
      lower(true);
    } else if (event.code === 'Space' && !event.repeat) {
      while (fits(piece.matrix, piece.x, piece.y + 1)) {
        piece.y++;
        score += 2;
      }
      hud();
      lock();
    } else if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
      const x = piece.x + directions(event.code)[0];
      if (fits(piece.matrix, x, piece.y)) piece.x = x;
    }
    draw();
    return true;
  }

  on(start, 'click', () => {
    reset();
    state = 'running';
    next = pull();
    spawn();
    start.textContent = 'Restart';
    pause.disabled = false;
    status.textContent = 'Stacking.';
    start.blur();
    hud();
    draw();
    schedule();
  });
  on(pause, 'click', () => { togglePause(); if (state === 'running') pause.blur(); });
  on(speed, 'change', reset);
  on(document, 'visibilitychange', () => { if (document.hidden && state === 'running') togglePause(); });
  signal.addEventListener('abort', () => clearTimeout(timer));
  reset();
}
