/* ── NAV ───────────────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    const tab = link.dataset.tab;
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
  excited: '#f9c85a', happy: '#e8b4b8', grateful: '#b8d4a0',
  calm: '#b8c9e8', numb: '#d4c9e0', tired: '#c8c4b8',
  anxious: '#f4b8a0', frustrated: '#f0a890', sad: '#a8b8d4'
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
          grid: { color: '#f0e6df' }
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

  const dotColors = { 2: '#e8b4b8', 5: '#b8c9e8', 10: '#a8c9b5', 15: '#f9c85a' };

  if (sessionChartInstance) sessionChartInstance.destroy();

  // Create or reuse an external HTML tooltip element
  let tooltipEl = document.getElementById('sessionTooltip');
  if (!tooltipEl) {
    tooltipEl = document.createElement('div');
    tooltipEl.id = 'sessionTooltip';
    tooltipEl.style.cssText = `
      position: absolute; pointer-events: none; display: none;
      background: #fff; border: 1px solid #f0e6df; border-radius: 10px;
      padding: 10px 14px; box-shadow: 0 4px 16px rgba(180,140,130,.15);
      font-family: 'DM Sans', sans-serif; font-size: 13px; color: #4a3f3a;
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
        pointBackgroundColor: points.map(p => dotColors[p.x] ?? '#d4c9e0'),
        pointBorderColor:     points.map(p => dotColors[p.x] ?? '#d4c9e0'),
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
            <div style="color:#9e8e88; font-size:12px">${m.minutes} min timer · session #${m.sessionNum}</div>
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
          title: { display: true, text: 'Timer Duration (minutes)', color: '#9e8e88', font: { size: 12 } },
          ticks: { stepSize: 1, callback: v => [2,5,10,15].includes(v) ? `${v} min` : '' },
          min: 0, max: 17,
          grid: { color: '#f0e6df' }
        },
        y: {
          title: { display: true, text: 'Times Used', color: '#9e8e88', font: { size: 12 } },
          beginAtZero: true,
          ticks: { stepSize: 1, precision: 0 },
          grid: { color: '#f0e6df' }
        }
      }
    }
  });

  // Hide tooltip when mouse leaves the canvas
  document.getElementById('sessionChart').addEventListener('mouseleave', () => {
    tooltipEl.style.display = 'none';
  });
}