"""
TimeCraft Backend — Flask + SQLite
-----------------------------------
A simple REST API backend for the TimeCraft timetable generator.

Why this design:
The frontend (app.js) previously stored everything as one big JSON
"database" object inside the browser's localStorage. To add a real
backend with the *minimum* amount of change to the existing frontend
logic, this server exposes the exact same JSON shape through two
endpoints:

    GET  /api/db    -> returns the full database object
    POST /api/db    -> overwrites the full database object

This means none of the 30+ feature functions in app.js (add subject,
assign teacher, generate timetable, etc.) need to change — they still
just read/write one JS object called DB. Only the small "load/save"
functions at the top of app.js were changed to call this API instead
of localStorage.

Session / login also gets its own small set of endpoints so that
login can be verified server-side instead of purely in the browser.

Run with:
    python server.py
Server starts on http://127.0.0.1:5000
"""

import json
import os
import sqlite3
from flask import Flask, request, jsonify, g
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "timecraft.db")
SEED_PATH = os.path.join(BASE_DIR, "data.json")

app = Flask(__name__)
CORS(app)  # allow the frontend (served from file:// or another port) to call this API

# ──────────────────────────────────────────────
# DATABASE CONNECTION HELPERS
# ──────────────────────────────────────────────
def get_conn():
    """Return a SQLite connection stored on Flask's request-scoped 'g' object."""
    if "conn" not in g:
        g.conn = sqlite3.connect(DB_PATH)
        g.conn.row_factory = sqlite3.Row
    return g.conn


@app.teardown_appcontext
def close_conn(exception=None):
    conn = g.pop("conn", None)
    if conn is not None:
        conn.close()


def init_db():
    """Create the table (if missing) and seed it with default data on first run."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT NOT NULL
        )
        """
    )
    cur = conn.execute("SELECT COUNT(*) FROM app_state WHERE id = 1")
    exists = cur.fetchone()[0] > 0

    if not exists:
        # Seed from data.json if present, otherwise use a built-in default
        if os.path.exists(SEED_PATH):
            with open(SEED_PATH, "r", encoding="utf-8") as f:
                seed = json.load(f)
        else:
            seed = default_state()
        conn.execute(
            "INSERT INTO app_state (id, data) VALUES (1, ?)",
            (json.dumps(seed),),
        )
        conn.commit()
    conn.close()


def default_state():
    """Fallback default database shape — mirrors data.json exactly."""
    return {
        "subjects": [],
        "classes": [],
        "teachers": [],
        "teacherSubjects": {},
        "classSubjects": {},
        "subjectPeriods": {},
        "users": [
            {"role": "hod", "username": "admin", "password": "admin123", "linked": ""}
        ],
        "config": {
            "periodDur": 45,
            "periodsPerDay": 6,
            "startTime": "08:00",
            "sb1After": 2,
            "sb1Dur": 15,
            "sb2After": 4,
            "sb2Dur": 15,
            "lunchAfter": 5,
            "lunchDur": 45,
        },
    }


# ──────────────────────────────────────────────
# ROUTES — FULL DATABASE (matches localStorage behaviour 1:1)
# ──────────────────────────────────────────────
@app.route("/api/db", methods=["GET"])
def get_db():
    """Return the entire application state as one JSON object."""
    conn = get_conn()
    row = conn.execute("SELECT data FROM app_state WHERE id = 1").fetchone()
    if row is None:
        return jsonify(default_state())
    return jsonify(json.loads(row["data"]))


@app.route("/api/db", methods=["POST"])
def save_db():
    """Overwrite the entire application state with the JSON body sent."""
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid or missing JSON body"}), 400

    conn = get_conn()
    conn.execute(
        "INSERT INTO app_state (id, data) VALUES (1, ?) "
        "ON CONFLICT(id) DO UPDATE SET data = excluded.data",
        (json.dumps(payload),),
    )
    conn.commit()
    return jsonify({"status": "ok"})


# ──────────────────────────────────────────────
# ROUTES — LOGIN (server-side credential check)
# ──────────────────────────────────────────────
@app.route("/api/login", methods=["POST"])
def login():
    """
    Validate username + password + role against the stored users list.
    Body: { "username": "...", "password": "...", "role": "hod"|"teacher"|"student" }
    """
    body = request.get_json(silent=True) or {}
    username = body.get("username", "").strip()
    password = body.get("password", "")
    role = body.get("role", "")

    conn = get_conn()
    row = conn.execute("SELECT data FROM app_state WHERE id = 1").fetchone()
    state = json.loads(row["data"]) if row else default_state()

    for user in state.get("users", []):
        if (
            user.get("username") == username
            and user.get("password") == password
            and user.get("role") == role
        ):
            return jsonify(
                {
                    "success": True,
                    "session": {
                        "role": user["role"],
                        "username": user["username"],
                        "linked": user.get("linked", ""),
                    },
                }
            )

    return jsonify({"success": False, "error": "Invalid credentials or role"}), 401


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "running", "service": "TimeCraft backend"})


# ──────────────────────────────────────────────
# BOOT
# ──────────────────────────────────────────────
if __name__ == "__main__":
    init_db()
    print(f"TimeCraft backend running — database file: {DB_PATH}")
    app.run(host="0.0.0.0", port=5000, debug=True)