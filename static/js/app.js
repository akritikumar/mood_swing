/* ── NAV ───────────────────────────────────────────────────────────────── */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'trends') { renderChart(); renderSessionChart(); }
  });
});

/* ── HELPERS ───────────────────────────────────────────────────────────── */
const show   = el => el.classList.remove('hidden');
const hide   = el => el.classList.add('hidden');

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

/* ══════════════════════════════════════════════════════════════════════════
   TAB: MOOD
══════════════════════════════════════════════════════════════════════════ */
const emojiGrid      = document.getElementById('emojiGrid');
const suggestionCard = document.getElementById('suggestionCard');
const suggestionText = document.getElementById('suggestionText');
const moodLoader     = document.getElementById('moodLoader');

emojiGrid.addEventListener('click', async e => {
  const btn = e.target.closest('.emoji-btn');
  if (!btn) return;

  // Highlight selection
  document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');

  hide(suggestionCard);
  show(moodLoader);

  try {
    const data = await post('/api/log-mood', {
      emoji: btn.dataset.emoji,
      label: btn.dataset.label
    });
    suggestionText.textContent = data.suggestion;
    show(suggestionCard);
  } catch {
    suggestionText.textContent = 'Something went wrong. Please try again.';
    show(suggestionCard);
  } finally {
    hide(moodLoader);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   TAB: TIMER
══════════════════════════════════════════════════════════════════════════ */
let   selectedSeconds = 120;
let   timerInterval   = null;
let   remaining       = selectedSeconds;
let   sessionsToday   = 0;

const timerDisplay    = document.getElementById('timerDisplay');
const startBtn        = document.getElementById('startBtn');
const resetBtn        = document.getElementById('resetBtn');
const sessionCount    = document.getElementById('sessionCount');
const celebrationCard = document.getElementById('celebrationCard');
const celebrationText = document.getElementById('celebrationText');
const timerLoader     = document.getElementById('timerLoader');
const taskInput       = document.getElementById('taskInput');

// Duration buttons
document.querySelectorAll('.duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (timerInterval) return; // don't change while running
    document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedSeconds = parseInt(btn.dataset.seconds);
    remaining = selectedSeconds;
    updateDisplay();
  });
});

function updateDisplay() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerDisplay.textContent = `${m}:${String(s).padStart(2, '0')}`;
}

async function onTimerComplete() {
  sessionsToday++;
  sessionCount.textContent = sessionsToday;
  clearInterval(timerInterval);
  timerInterval = null;
  startBtn.textContent = '▶ Start';
  timerDisplay.classList.remove('running');

  hide(celebrationCard);
  show(timerLoader);

  try {
    const data = await post('/api/timer-complete', {
      task: taskInput.value || 'your task',
      sessionsCompleted: sessionsToday,
      minutes: selectedSeconds / 60
    });
    celebrationText.textContent = data.message;
    show(celebrationCard);
  } catch {
    celebrationText.textContent = '🎉 Amazing work! Keep going!';
    show(celebrationCard);
  } finally {
    hide(timerLoader);
  }

  remaining = selectedSeconds;
  updateDisplay();
}

startBtn.addEventListener('click', () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
    startBtn.textContent = '▶ Resume';
    timerDisplay.classList.remove('running');
  } else {
    timerDisplay.classList.add('running');
    startBtn.textContent = '⏸ Pause';
    timerInterval = setInterval(() => {
      remaining--;
      updateDisplay();
      if (remaining <= 0) onTimerComplete();
    }, 1000);
  }
});

resetBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerInterval = null;
  remaining = selectedSeconds;
  updateDisplay();
  startBtn.textContent = '▶ Start';
  timerDisplay.classList.remove('running');
});

updateDisplay();

/* ══════════════════════════════════════════════════════════════════════════
   STUDY ASSISTANT
══════════════════════════════════════════════════════════════════════════ */
const studyBtn         = document.getElementById('studyBtn');
const studyTopic       = document.getElementById('studyTopic');
const studyMode        = document.getElementById('studyMode');
const studyLoader      = document.getElementById('studyLoader');
const studyResultCard  = document.getElementById('studyResultCard');
const studyResultText  = document.getElementById('studyResultText');
const studyResultLabel = document.getElementById('studyResultLabel');

const MODE_LABELS = {
  explain:    '📖 Explanation',
  quiz:       '❓ Quiz',
  summarize:  '📝 Summary',
  flashcards: '🃏 Flashcards',
  essay:      '✍️ Essay Outline'
};

studyBtn.addEventListener('click', async () => {
  const topic = studyTopic.value.trim();
  if (!topic) { alert('Please enter a topic first!'); return; }

  hide(studyResultCard);
  show(studyLoader);

  try {
    const data = await post('/api/study', { topic, mode: studyMode.value });
    studyResultLabel.textContent = MODE_LABELS[studyMode.value] + ' — ' + topic;
    studyResultText.textContent = data.result;
    show(studyResultCard);
  } catch {
    studyResultText.textContent = 'Something went wrong. Please try again.';
    show(studyResultCard);
  } finally {
    hide(studyLoader);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   TAB: JOURNAL
══════════════════════════════════════════════════════════════════════════ */
const getPromptBtn   = document.getElementById('getPromptBtn');
const promptCard     = document.getElementById('promptCard');
const promptText     = document.getElementById('promptText');
const promptLoader   = document.getElementById('promptLoader');
const journalEntry   = document.getElementById('journalEntry');
const reflectBtn     = document.getElementById('reflectBtn');
const reflectionCard = document.getElementById('reflectionCard');
const reflectionText = document.getElementById('reflectionText');
const reflectLoader  = document.getElementById('reflectLoader');
const journalMood    = document.getElementById('journalMoodSelect');

getPromptBtn.addEventListener('click', async () => {
  hide(promptCard);
  show(promptLoader);
  try {
    const data = await post('/api/journal-prompt', { mood: journalMood.value });
    promptText.textContent = data.prompt;
    show(promptCard);
  } catch {
    promptText.textContent = 'What are three things you appreciate about today?';
    show(promptCard);
  } finally {
    hide(promptLoader);
  }
});

reflectBtn.addEventListener('click', async () => {
  const entry = journalEntry.value.trim();
  if (!entry) { alert('Write something first! Even a sentence is perfect.'); return; }
  hide(reflectionCard);
  show(reflectLoader);
  try {
    const data = await post('/api/journal-reflect', { entry });
    reflectionText.textContent = data.reflection;
    show(reflectionCard);
  } catch {
    reflectionText.textContent = 'Thank you for sharing. Your words matter.';
    show(reflectionCard);
  } finally {
    hide(reflectLoader);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   TAB: TRENDS  (Chart.js)
══════════════════════════════════════════════════════════════════════════ */
const insightBtn    = document.getElementById('insightBtn');
const insightCard   = document.getElementById('insightCard');
const insightText   = document.getElementById('insightText');
const insightLoader = document.getElementById('insightLoader');

const MOOD_SCORE = {
  excited: 5, happy: 4, grateful: 4, calm: 3,
  numb: 2, tired: 2, anxious: 1, frustrated: 1, sad: 1
};
const MOOD_COLOR = {
  excited: '#a85e20', happy: '#6b8c42', grateful: '#c8884a',
  calm:    '#2a3d1e', numb:  '#b8a878', tired:    '#8a7a5a',
  anxious: '#c8884a', frustrated: '#a85e20', sad: '#4a6a30'
};

let chartInstance = null;

async function renderChart() {
  const res  = await fetch('/api/moods');
  const data = await res.json();

  if (!data.length) return;

  const labels  = data.map(d => d.date.slice(5));   // MM-DD
  const scores  = data.map(d => MOOD_SCORE[d.label] ?? 3);
  const colors  = data.map(d => MOOD_COLOR[d.label] ?? '#e8b4b8');
  const emojis  = data.map(d => d.emoji);

  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById('moodChart').getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Mood',
        data: scores,
        backgroundColor: colors,
        borderRadius: 10,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `${emojis[items[0].dataIndex]} ${data[items[0].dataIndex].label}`,
            label: () => ''
          }
        }
      },
      scales: {
        y: {
          min: 0, max: 5,
          ticks: {
            stepSize: 1,
            callback: v => ['','😔','😴','😌','😊','🤩'][v]
          },
          grid: { color: '#d8ceb0' }
        },
        x: { grid: { display: false } }
      }
    }
  });
}

insightBtn.addEventListener('click', async () => {
  hide(insightCard);
  show(insightLoader);
  try {
    const data = await post('/api/trends', {});
    insightText.textContent = data.insight;
    show(insightCard);
  } catch {
    insightText.textContent = 'Keep logging your moods to unlock insights!';
    show(insightCard);
  } finally {
    hide(insightLoader);
  }
});

/* ══════════════════════════════════════════════════════════════════════════
   STUDY SESSIONS DOT PLOT
══════════════════════════════════════════════════════════════════════════ */
let sessionChartInstance = null;

async function renderSessionChart() {
  const sessions   = await (await fetch('/api/sessions')).json();
  const emptyMsg   = document.getElementById('sessionEmpty');
  const canvas     = document.getElementById('sessionChart');

  if (!sessions.length) {
    canvas.classList.add('hidden');
    show(emptyMsg);
    return;
  }
  canvas.classList.remove('hidden');
  hide(emptyMsg);

  // Group sessions by duration, tracking individual task names per (minutes, count) coordinate
  // x = minutes, y = running count of uses for that duration
  const byMinutes = {}; // { "2": [{task, timestamp}, ...], "5": [...], ... }
  sessions.forEach(s => {
    const key = String(s.minutes);
    if (!byMinutes[key]) byMinutes[key] = [];
    byMinutes[key].push(s);
  });

  // Build one dot per session: x = minutes, y = index within that duration group (1-based)
  const points   = [];   // pure {x, y} for Chart.js
  const metadata = [];   // parallel array with task/timestamp info

  Object.entries(byMinutes).forEach(([mins, entries]) => {
    entries.forEach((entry, idx) => {
      points.push({ x: parseFloat(mins), y: idx + 1 });
      metadata.push({ task: entry.task, minutes: parseFloat(mins), sessionNum: idx + 1 });
    });
  });

  const dotColors = { 2: '#6b8c42', 5: '#c8884a', 10: '#2a3d1e', 15: '#a85e20' };

  if (sessionChartInstance) sessionChartInstance.destroy();

  // Create or reuse an external HTML tooltip element
  let tooltipEl = document.getElementById('sessionTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sessionTooltip';
    tooltipEl.style.cssText = `
      position: absolute; pointer-events: none; display: none;
      background: #faf8f0; border: 1px solid #d8ceb0; border-radius: 10px;
      padding: 10px 14px; box-shadow: 0 4px 16px rgba(42,61,30,.12);
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: #2a3d1e;
      white-space: nowrap; z-index: 100;
    `;
    document.body.appendChild(tooltipEl);
  }

  const ctx = document.getElementById('sessionChart').getContext('2d');
  sessionChartInstance = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Sessions',
        data: points,
        pointBackgroundColor: points.map(p => dotColors[p.x] ?? '#a8b8c8'),
        pointBorderColor:     points.map(p => dotColors[p.x] ?? '#a8b8c8'),
        pointRadius: 10,
        pointHoverRadius: 13,
        pointBorderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { enabled: false }   // disable built-in tooltip
      },
      onHover: (event, activeElements) => {
        if (activeElements.length > 0) {
          const idx = activeElements[0].index;
          const m   = metadata[idx];
          tooltipEl.innerHTML = `
            <div style="font-weight:500; margin-bottom:3px">📝 ${m.task}</div>
            <div style="color:#7a6a4a; font-size:12px">${m.minutes} min timer · session #${m.sessionNum}</div>
          `;
          tooltipEl.style.display = 'block';
          // Position near the cursor
          const canvasRect = event.native.target.getBoundingClientRect();
          tooltipEl.style.left = (canvasRect.left + window.scrollX + event.native.offsetX + 14) + 'px';
          tooltipEl.style.top  = (canvasRect.top  + window.scrollY + event.native.offsetY - 40) + 'px';
        } else {
          tooltipEl.style.display = 'none';
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Timer Duration (minutes)', color: '#7a6a4a', font: { size: 12 } },
          ticks: { stepSize: 1, callback: v => [2,5,10,15].includes(v) ? `${v} min` : '' },
          min: 0, max: 17,
          grid: { color: '#d8ceb0' }
        },
        y: {
          title: { display: true, text: 'Times Used', color: '#7a6a4a', font: { size: 12 } },
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
          grid: { color: '#d8ceb0' }
        }
      }
    }
  });

  // Hide tooltip when mouse leaves the canvas
  document.getElementById('sessionChart').addEventListener('mouseleave', () => {
    tooltipEl.style.display = 'none';
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   TASK TRACKER
══════════════════════════════════════════════════════════════════════════ */
const taskList     = document.getElementById('taskList');
const taskEmpty    = document.getElementById('taskEmpty');
const newTaskTitle = document.getElementById('newTaskTitle');
const addTaskBtn   = document.getElementById('addTaskBtn');

const PRIORITY_LABEL = { 1: 'Low', 2: 'Medium', 3: 'High' };
const PRIORITY_BADGE = { 1: 'badge-low', 2: 'badge-medium', 3: 'badge-high' };

// ── priority pill selection ──
let selectedPriority = 2;
document.querySelectorAll('#newTaskPriority .priority-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('#newTaskPriority .priority-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedPriority = parseInt(pill.dataset.value);
  });
});

// ── load and render all tasks ──
async function loadTasks() {
  const tasks = await (await fetch('/api/tasks')).json();
  taskList.innerHTML = '';

  if (!tasks.length) {
    show(taskEmpty);
    return;
  }
  hide(taskEmpty);

  tasks.forEach(task => taskList.appendChild(buildTaskEl(task)));
}

function buildTaskEl(task) {
  const el = document.createElement('div');
  el.className = `task-item${task.done ? ' done' : ''}`;
  el.dataset.id       = task.id;
  el.dataset.priority = task.priority;

  el.innerHTML = `
    <div class="task-top">
      <div class="task-check ${task.done ? 'checked' : ''}" data-id="${task.id}">
        ${task.done ? '✓' : ''}
      </div>
      <span class="task-title">${escapeHtml(task.title)}</span>
      <div class="task-meta">
        <span class="priority-badge ${PRIORITY_BADGE[task.priority]}">${PRIORITY_LABEL[task.priority]}</span>
        <button class="task-delete" data-id="${task.id}" title="Delete task">🗑</button>
      </div>
    </div>
    <div class="task-progress-row">
      <div class="progress-track">
        <div class="progress-fill" style="width:${task.progress}%"></div>
        <input class="progress-slider" type="range" min="0" max="100"
               value="${task.progress}" data-id="${task.id}" />
      </div>
      <span class="progress-pct">${task.progress}%</span>
    </div>
  `;

  // progress slider
  const slider = el.querySelector('.progress-slider');
  const fill   = el.querySelector('.progress-fill');
  const pct    = el.querySelector('.progress-pct');

  slider.addEventListener('input', () => {
    fill.style.width = slider.value + '%';
    pct.textContent  = slider.value + '%';
  });
  slider.addEventListener('change', async () => {
    await patch(`/api/tasks/${task.id}`, { progress: parseInt(slider.value) });
    loadTasks(); // re-render so done state updates
  });

  // check button
  el.querySelector('.task-check').addEventListener('click', async () => {
    await patch(`/api/tasks/${task.id}`, { done: !task.done });
    loadTasks();
  });

  // delete button
  el.querySelector('.task-delete').addEventListener('click', async () => {
    await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    loadTasks();
  });

  return el;
}

// ── add task ──
addTaskBtn.addEventListener('click', addTask);
newTaskTitle.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

async function addTask() {
  const title = newTaskTitle.value.trim();
  if (!title) { newTaskTitle.focus(); return; }
  await post('/api/tasks', { title, priority: selectedPriority });
  newTaskTitle.value = '';
  loadTasks();
}

// ── load tasks when tab is clicked ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  if (btn.dataset.tab === 'tasks') {
    btn.addEventListener('click', loadTasks);
  }
});

// ── helper: PATCH request ──
async function patch(url, body) {
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

// ── helper: escape HTML to prevent XSS ──
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════════════════════════════════════════
   SCHEDULE
══════════════════════════════════════════════════════════════════════════ */

// ── state ──
let scheduleView    = 'week';     // 'week' | 'month'
let calOffset       = 0;          // weeks or months offset from today
let allLabels       = [];
let allBlocks       = [];
let modalDate       = null;
let selectedColor   = '#723d46';
let selectedMinutes = 60;

// ── load schedule tab when clicked ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  if (btn.dataset.tab === 'schedule') {
    btn.addEventListener('click', initSchedule);
  }
});

async function initSchedule() {
  await Promise.all([loadLabels(), loadBlocks()]);
  renderCalendar();
}

// ── labels ──
async function loadLabels() {
  allLabels = await (await fetch('/api/labels')).json();
  renderLabelsList();
  renderModalLabelSelect();
}

function renderLabelsList() {
  const list  = document.getElementById('labelsList');
  const empty = document.getElementById('labelsEmpty');
  if (!allLabels.length) { list.innerHTML = ''; list.appendChild(empty); show(empty); return; }
  hide(empty);
  list.innerHTML = allLabels.map(l => `
    <div class="label-chip">
      <span class="label-dot" style="background:${l.color}"></span>
      <span class="label-chip-name">${escapeHtml(l.name)}</span>
      <button class="label-chip-del" data-id="${l.id}" title="Delete">✕</button>
    </div>
  `).join('');
  list.querySelectorAll('.label-chip-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      await fetch(`/api/labels/${btn.dataset.id}`, { method: 'DELETE' });
      await loadLabels();
      await loadBlocks();
      renderCalendar();
    });
  });
}

function renderModalLabelSelect() {
  const sel = document.getElementById('modalLabelSelect');
  sel.innerHTML = allLabels.length
    ? allLabels.map(l => `<option value="${l.id}">${l.name}</option>`).join('')
    : '<option value="">No labels yet</option>';
}

// color swatch picker
document.querySelectorAll('#colorSwatches .swatch:not(.swatch-custom)').forEach(s => {
  s.addEventListener('click', () => {
    document.querySelectorAll('#colorSwatches .swatch').forEach(x => x.classList.remove('active'));
    s.classList.add('active');
    selectedColor = s.dataset.color;
    document.getElementById('customColor').value = selectedColor;
  });
});
document.getElementById('customColor').addEventListener('input', e => {
  document.querySelectorAll('#colorSwatches .swatch').forEach(x => x.classList.remove('active'));
  e.target.classList.add('active');
  selectedColor = e.target.value;
});

document.getElementById('addLabelBtn').addEventListener('click', async () => {
  const name = document.getElementById('labelNameInput').value.trim();
  if (!name) { document.getElementById('labelNameInput').focus(); return; }
  await post('/api/labels', { name, color: selectedColor });
  document.getElementById('labelNameInput').value = '';
  await loadLabels();
});

// ── blocks ──
async function loadBlocks() {
  allBlocks = await (await fetch('/api/schedule')).json();
}

function blocksForDate(dateStr) {
  return allBlocks.filter(b => b.date === dateStr);
}

// ── calendar rendering ──
function renderCalendar() {
  scheduleView === 'week' ? renderWeek() : renderMonth();
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

function fmtMinutes(m) {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60), min = m % 60;
  return min ? `${h}h ${min}m` : `${h}h`;
}

function renderWeek() {
  const today   = new Date();
  const monday  = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) + calOffset * 7);

  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });

  // title
  const opts = { month: 'short', day: 'numeric' };
  document.getElementById('calTitle').textContent =
    `${days[0].toLocaleDateString('en-US', opts)} – ${days[6].toLocaleDateString('en-US', {...opts, year: 'numeric'})}`;

  const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const grid = document.getElementById('calGrid');
  grid.innerHTML = `
    <div class="cal-week-header">
      ${DAY_NAMES.map(n => `<div class="cal-day-name">${n}</div>`).join('')}
    </div>
    <div class="cal-week-body">
      ${days.map(d => buildCell(d, true)).join('')}
    </div>
  `;
  attachCellListeners();
}

function renderMonth() {
  const today = new Date();
  const ref   = new Date(today.getFullYear(), today.getMonth() + calOffset, 1);
  const year  = ref.getFullYear();
  const month = ref.getMonth();

  document.getElementById('calTitle').textContent =
    ref.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // first cell = Monday of the week containing the 1st
  const firstDay = new Date(year, month, 1);
  const startOff = (firstDay.getDay() + 6) % 7;
  const start    = new Date(firstDay);
  start.setDate(1 - startOff);

  // build 6 weeks
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push(d);
  }

  const DAY_NAMES = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const grid = document.getElementById('calGrid');
  grid.innerHTML = `
    <div class="cal-month-header">
      ${DAY_NAMES.map(n => `<div class="cal-day-name">${n}</div>`).join('')}
    </div>
    <div class="cal-month-body">
      ${cells.map(d => buildCell(d, false, d.getMonth() !== month)).join('')}
    </div>
  `;
  attachCellListeners();
}

function buildCell(d, isWeek = false, otherMonth = false) {
  const ds      = isoDate(d);
  const todayDs = isoDate(new Date());
  const isToday = ds === todayDs;
  const blocks  = blocksForDate(ds);

  const pillsHtml = blocks.map(b => `
    <div class="block-pill" style="background:${b.label_color}" data-id="${b.id}">
      <span>${escapeHtml(b.label_name)}</span>
      <span class="block-pill-time">${fmtMinutes(b.minutes)}</span>
      <button class="block-pill-del" data-id="${b.id}" title="Remove">✕</button>
    </div>
  `).join('');

  return `
    <div class="cal-cell ${isWeek ? 'week-cell' : ''} ${isToday ? 'today' : ''} ${otherMonth ? 'other-month' : ''}"
         data-date="${ds}">
      <span class="cal-date-num">${d.getDate()}</span>
      ${pillsHtml}
      <button class="cal-add-btn" data-date="${ds}" title="Add block">+</button>
    </div>
  `;
}

function attachCellListeners() {
  // clicking a cell or its + button opens the modal
  document.querySelectorAll('.cal-cell').forEach(cell => {
    cell.addEventListener('click', e => {
      if (e.target.closest('.block-pill-del')) return;
      openModal(cell.dataset.date);
    });
  });
  // delete a block pill
  document.querySelectorAll('.block-pill-del').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      await fetch(`/api/schedule/${btn.dataset.id}`, { method: 'DELETE' });
      await loadBlocks();
      renderCalendar();
    });
  });
}

// ── modal ──
function openModal(dateStr) {
  if (!allLabels.length) { alert('Create at least one label first!'); return; }
  modalDate = dateStr;
  const d = new Date(dateStr + 'T00:00:00');
  document.getElementById('modalDateLabel').textContent =
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  // reset duration selection
  selectedMinutes = 60;
  document.querySelectorAll('.dur-pill').forEach(p => {
    p.classList.toggle('active', parseInt(p.dataset.minutes) === 60);
  });
  document.getElementById('modalNote').value = '';
  show(document.getElementById('blockModal'));
}

document.getElementById('modalClose').addEventListener('click', () => {
  hide(document.getElementById('blockModal'));
});
document.getElementById('blockModal').addEventListener('click', e => {
  if (e.target === document.getElementById('blockModal')) hide(document.getElementById('blockModal'));
});

document.querySelectorAll('.dur-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.dur-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedMinutes = parseInt(pill.dataset.minutes);
  });
});

document.getElementById('modalSaveBtn').addEventListener('click', async () => {
  const labelId = document.getElementById('modalLabelSelect').value;
  const note    = document.getElementById('modalNote').value.trim();
  if (!labelId) { alert('Please select a label.'); return; }
  await post('/api/schedule', { date: modalDate, label_id: parseInt(labelId), minutes: selectedMinutes, note });
  hide(document.getElementById('blockModal'));
  await loadBlocks();
  renderCalendar();
});

// ── toolbar controls ──
document.getElementById('weekViewBtn').addEventListener('click', () => {
  scheduleView = 'week'; calOffset = 0;
  document.getElementById('weekViewBtn').classList.add('active');
  document.getElementById('monthViewBtn').classList.remove('active');
  renderCalendar();
});
document.getElementById('monthViewBtn').addEventListener('click', () => {
  scheduleView = 'month'; calOffset = 0;
  document.getElementById('monthViewBtn').classList.add('active');
  document.getElementById('weekViewBtn').classList.remove('active');
  renderCalendar();
});
document.getElementById('calPrev').addEventListener('click', () => { calOffset--; renderCalendar(); });
document.getElementById('calNext').addEventListener('click', () => { calOffset++; renderCalendar(); });
document.getElementById('calTodayBtn').addEventListener('click', () => { calOffset = 0; renderCalendar(); });