from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime, date
import anthropic

app = Flask(__name__)
DATA_FILE     = "data/moods.json"
SESSIONS_FILE = "data/sessions.json"

# ── helpers ──────────────────────────────────────────────────────────────────

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    with open(DATA_FILE, "r") as f:
        return json.load(f)

def save_data(data):
    os.makedirs("data", exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

def load_sessions():
    if not os.path.exists(SESSIONS_FILE):
        return []
    with open(SESSIONS_FILE, "r") as f:
        return json.load(f)

def save_sessions(data):
    os.makedirs("data", exist_ok=True)
    with open(SESSIONS_FILE, "w") as f:
        json.dump(data, f, indent=2)

def call_claude(prompt: str, system: str = "") -> str:
    client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY from env
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
    body   = request.json
    emoji  = body.get("emoji")
    label  = body.get("label")
    today  = date.today().isoformat()

    data = load_data()

    # Only one entry per day
    data = [d for d in data if d["date"] != today]
    data.append({"date": today, "emoji": emoji, "label": label})
    save_data(data)

    # Ask Claude for a personalised suggestion
    suggestion = call_claude(
        f"The user feels {label} today (emoji: {emoji}). "
        "Give them one warm, specific activity suggestion in 2-3 sentences."
    )
    return jsonify({"suggestion": suggestion})

@app.route("/api/moods")
def get_moods():
    return jsonify(load_data())

# ---------- journal ------------------------------------------------------------

@app.route("/api/journal-prompt", methods=["POST"])
def journal_prompt():
    body  = request.json
    mood  = body.get("mood", "neutral")
    prompt = call_claude(
        f"The user is feeling {mood}. Generate one thoughtful, open-ended journaling prompt "
        "that encourages positive thinking and gratitude. Just the prompt, no preamble."
    )
    return jsonify({"prompt": prompt})

@app.route("/api/journal-reflect", methods=["POST"])
def journal_reflect():
    body   = request.json
    entry  = body.get("entry", "")
    reflection = call_claude(
        f"The user wrote this journal entry:\n\n{entry}\n\n"
        "Respond with a warm, 2-3 sentence reflection that validates their feelings and highlights a positive insight.",
        system="You are a compassionate journaling coach. Be warm, brief, and uplifting."
    )
    return jsonify({"reflection": reflection})

# ---------- trends ------------------------------------------------------------

@app.route("/api/trends", methods=["POST"])
def trends():
    data = load_data()
    if len(data) < 3:
        return jsonify({"insight": "Keep logging your moods — insights appear after a few days! 🌱"})
    summary = ", ".join([f"{d['date']}: {d['label']}" for d in data[-14:]])
    insight = call_claude(
        f"Here are the user's recent mood logs (last 14 days):\n{summary}\n\n"
        "Identify any patterns or trends and give a gentle, encouraging 2-3 sentence insight.",
        system="You are a kind wellness analyst. Be warm, concise, and constructive."
    )
    return jsonify({"insight": insight})

# ---------- timer (no AI needed) ----------------------------------------------

# Timer is handled entirely on the front-end; this endpoint logs the session
# and returns a motivational nudge when a session completes.
@app.route("/api/timer-complete", methods=["POST"])
def timer_complete():
    body     = request.json
    task     = body.get("task", "your task")
    count    = body.get("sessionsCompleted", 1)
    minutes  = body.get("minutes", 2)
    now      = datetime.now().isoformat(timespec="seconds")

    # Save the session
    sessions = load_sessions()
    sessions.append({"task": task, "minutes": minutes, "timestamp": now})
    save_sessions(sessions)

    msg = call_claude(
        f"The user just completed a {minutes}-minute focus session on '{task}'. "
        f"They've done {count} session(s) in a row. "
        "Give them a short, enthusiastic 1-sentence celebration."
    )
    return jsonify({"message": msg})

@app.route("/api/sessions")
def get_sessions():
    return jsonify(load_sessions())

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