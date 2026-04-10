from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from datetime import datetime, date
import anthropic

app = Flask(__name__)

DB_PATH = "data/moodflow.db"

# ── database setup ────────────────────────────────────────────────────────────
# Called once when the app starts. Creates the database file and tables
# if they don't already exist.

def init_db():
    os.makedirs("data", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Table 1: one mood entry per day
    c.execute("""
        CREATE TABLE IF NOT EXISTS moods (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            date      TEXT    UNIQUE NOT NULL,
            emoji     TEXT    NOT NULL,
            label     TEXT    NOT NULL
        )
    """)

    # Table 2: every completed focus/study session
    c.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            task      TEXT    NOT NULL,
            minutes   REAL    NOT NULL,
            timestamp TEXT    NOT NULL
        )
    """)

    # Table 3: user tasks with priority and progress
    c.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            title      TEXT    NOT NULL,
            priority   INTEGER NOT NULL DEFAULT 2,
            progress   INTEGER NOT NULL DEFAULT 0,
            done       INTEGER NOT NULL DEFAULT 0,
            created_at TEXT    NOT NULL
        )
    """)

    conn.commit()
    conn.close()


def get_db():
    """Open a database connection with row_factory so rows behave like dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row   # lets us do row["column"] instead of row[0]
    return conn


# Initialise the database when the app first loads
init_db()

# ── claude helper ─────────────────────────────────────────────────────────────

def call_claude(prompt: str, system: str = "") -> str:
    client = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from env
    msg = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=512,
        system=system or "You are a warm, supportive wellness companion. Keep responses concise, kind, and practical.",
        messages=[{"role": "user", "content": prompt}]
    )
    return msg.content[0].text

# ── routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")

# ---------- mood ---------------------------------------------------------------

@app.route("/api/log-mood", methods=["POST"])
def log_mood():
    body  = request.json
    emoji = body.get("emoji")
    label = body.get("label")
    today = date.today().isoformat()

    conn = get_db()
    # INSERT OR REPLACE enforces one entry per day (UNIQUE constraint on date)
    conn.execute(
        "INSERT OR REPLACE INTO moods (date, emoji, label) VALUES (?, ?, ?)",
        (today, emoji, label)
    )
    conn.commit()
    conn.close()

    suggestion = call_claude(
        f"The user feels {label} today (emoji: {emoji}). "
        "Give them one warm, specific activity suggestion in 2-3 sentences."
    )
    return jsonify({"suggestion": suggestion})


@app.route("/api/moods")
def get_moods():
    conn = get_db()
    rows = conn.execute("SELECT date, emoji, label FROM moods ORDER BY date ASC").fetchall()
    conn.close()
    # Convert sqlite3.Row objects to plain dicts for jsonify
    return jsonify([dict(r) for r in rows])

# ---------- journal ------------------------------------------------------------

@app.route("/api/journal-prompt", methods=["POST"])
def journal_prompt():
    mood = request.json.get("mood", "neutral")
    prompt = call_claude(
        f"The user is feeling {mood}. Generate one thoughtful, open-ended journaling prompt "
        "that encourages positive thinking and gratitude. Just the prompt, no preamble."
    )
    return jsonify({"prompt": prompt})


@app.route("/api/journal-reflect", methods=["POST"])
def journal_reflect():
    entry = request.json.get("entry", "")
    reflection = call_claude(
        f"The user wrote this journal entry:\n\n{entry}\n\n"
        "Respond with a warm, 2-3 sentence reflection that validates their feelings and highlights a positive insight.",
        system="You are a compassionate journaling coach. Be warm, brief, and uplifting."
    )
    return jsonify({"reflection": reflection})

# ---------- trends ------------------------------------------------------------

@app.route("/api/trends", methods=["POST"])
def trends():
    conn = get_db()
    rows = conn.execute(
        "SELECT date, label FROM moods ORDER BY date DESC LIMIT 14"
    ).fetchall()
    conn.close()

    if len(rows) < 3:
        return jsonify({"insight": "Keep logging your moods — insights appear after a few days! 🌱"})

    summary = ", ".join([f"{r['date']}: {r['label']}" for r in reversed(rows)])
    insight = call_claude(
        f"Here are the user's recent mood logs (last 14 days):\n{summary}\n\n"
        "Identify any patterns or trends and give a gentle, encouraging 2-3 sentence insight.",
        system="You are a kind wellness analyst. Be warm, concise, and constructive."
    )
    return jsonify({"insight": insight})

# ---------- timer -------------------------------------------------------------

@app.route("/api/timer-complete", methods=["POST"])
def timer_complete():
    body    = request.json
    task    = body.get("task", "your task")
    count   = body.get("sessionsCompleted", 1)
    minutes = body.get("minutes", 2)
    now     = datetime.now().isoformat(timespec="seconds")

    conn = get_db()
    conn.execute(
        "INSERT INTO sessions (task, minutes, timestamp) VALUES (?, ?, ?)",
        (task, minutes, now)
    )
    conn.commit()
    conn.close()

    msg = call_claude(
        f"The user just completed a {minutes}-minute focus session on '{task}'. "
        f"They've done {count} session(s) in a row. "
        "Give them a short, enthusiastic 1-sentence celebration."
    )
    return jsonify({"message": msg})


@app.route("/api/sessions")
def get_sessions():
    conn = get_db()
    rows = conn.execute(
        "SELECT task, minutes, timestamp FROM sessions ORDER BY timestamp ASC"
    ).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])

# ---------- tasks -------------------------------------------------------------

@app.route("/api/tasks", methods=["GET"])
def get_tasks():
    conn = get_db()
    # Order by: incomplete first, then priority descending (3=high on top), then created date
    rows = conn.execute("""
        SELECT id, title, priority, progress, done, created_at
        FROM tasks
        ORDER BY done ASC, priority DESC, created_at ASC
    """).fetchall()
    conn.close()
    return jsonify([dict(r) for r in rows])


@app.route("/api/tasks", methods=["POST"])
def add_task():
    body     = request.json
    title    = body.get("title", "").strip()
    priority = int(body.get("priority", 2))
    if not title:
        return jsonify({"error": "Title is required"}), 400
    now = datetime.now().isoformat(timespec="seconds")
    conn = get_db()
    conn.execute(
        "INSERT INTO tasks (title, priority, progress, done, created_at) VALUES (?, ?, 0, 0, ?)",
        (title, priority, now)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/tasks/<int:task_id>", methods=["PATCH"])
def update_task(task_id):
    body = request.json
    conn = get_db()
    if "progress" in body:
        progress = max(0, min(100, int(body["progress"])))
        # Auto-mark done when progress hits 100
        done = 1 if progress == 100 else 0
        conn.execute(
            "UPDATE tasks SET progress = ?, done = ? WHERE id = ?",
            (progress, done, task_id)
        )
    if "priority" in body:
        conn.execute(
            "UPDATE tasks SET priority = ? WHERE id = ?",
            (int(body["priority"]), task_id)
        )
    if "done" in body:
        done = 1 if body["done"] else 0
        progress = 100 if done else conn.execute(
            "SELECT progress FROM tasks WHERE id = ?", (task_id,)
        ).fetchone()["progress"]
        conn.execute(
            "UPDATE tasks SET done = ?, progress = ? WHERE id = ?",
            (done, progress, task_id)
        )
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/tasks/<int:task_id>", methods=["DELETE"])
def delete_task(task_id):
    conn = get_db()
    conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ---------- study assistant ---------------------------------------------------

@app.route("/api/study", methods=["POST"])
def study():
    body  = request.json
    topic = body.get("topic", "")
    mode  = body.get("mode", "explain")

    prompts = {
        "explain":    f"Explain '{topic}' simply and clearly for a student. Use plain language, a brief overview, and 2-3 key points.",
        "quiz":       f"Create a 5-question quiz on '{topic}'. Number each question, and put the answers at the bottom separated by a line.",
        "summarize":  f"Give a concise study summary of '{topic}' in bullet points covering the most important facts a student should know.",
        "flashcards": f"Create 6 flashcards for studying '{topic}'. Format each as:\nQ: [question]\nA: [answer]\n",
        "essay":      f"Create a structured essay outline on '{topic}' with an intro, 3 main body sections with sub-points, and a conclusion.",
    }

    result = call_claude(
        prompts.get(mode, prompts["explain"]),
        system="You are a helpful, encouraging study tutor. Be clear, structured, and student-friendly."
    )
    return jsonify({"result": result})


if __name__ == "__main__":
    app.run(debug=True)