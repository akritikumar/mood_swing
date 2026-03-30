/* ── NAV ───────────────────────────────────────────────────────────────── */
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    link.classList.add('active');
    const tab = link.dataset.tab;
    document.getElementById(`tab-${tab}`).classList.add('active');
    if (tab === 'trends') renderChart();
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
const TIMER_SECONDS  = 120;
let   timerInterval  = null;
let   remaining      = TIMER_SECONDS;
let   sessionsToday  = 0;

const timerDisplay    = document.getElementById('timerDisplay');
const startBtn        = document.getElementById('startBtn');
const resetBtn        = document.getElementById('resetBtn');
const sessionCount    = document.getElementById('sessionCount');
const celebrationCard = document.getElementById('celebrationCard');
const celebrationText = document.getElementById('celebrationText');
const timerLoader     = document.getElementById('timerLoader');
const taskInput       = document.getElementById('taskInput');

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
      sessionsCompleted: sessionsToday
    });
    celebrationText.textContent = data.message;
    show(celebrationCard);
  } catch {
    celebrationText.textContent = '🎉 Amazing work! Keep going!';
    show(celebrationCard);
  } finally {
    hide(timerLoader);
  }

  remaining = TIMER_SECONDS;
  updateDisplay();
}

startBtn.addEventListener('click', () => {
  if (timerInterval) {
    // Pause
    clearInterval(timerInterval);
    timerInterval = null;
    startBtn.textContent = '▶ Resume';
    timerDisplay.classList.remove('running');
  } else {
    // Start / resume
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
  remaining = TIMER_SECONDS;
  updateDisplay();
  startBtn.textContent = '▶ Start';
  timerDisplay.classList.remove('running');
});

updateDisplay();

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