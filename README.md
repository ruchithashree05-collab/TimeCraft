# TimeCraft — with Python Backend

This folder contains the TimeCraft timetable generator with a real
Python backend (Flask + SQLite) instead of browser-only storage.

## Files
- `index.html` — the app's HTML/CSS (unchanged from the browser-only version)
- `app.js` — the app's JavaScript logic (now talks to the Python backend
  instead of localStorage)
- `server.py` — the Python backend (Flask REST API + SQLite database)
- `data.json` — default seed data used the very first time the server runs
- `requirements.txt` — Python packages needed

## How it works
- `server.py` exposes three endpoints:
  - `GET  /api/db`    → returns the entire app's data as JSON
  - `POST /api/db`    → saves the entire app's data as JSON
  - `POST /api/login` → checks username/password/role against stored users
- All actual data (subjects, classes, teachers, timetables, user accounts)
  now lives in a SQLite database file (`timecraft.db`), not in the browser.
  This means the data is shared and persists properly, and multiple people
  could eventually connect to the same backend from different computers
  on the same network.

## Setup & Run

1. Install Python packages (only needed once):
   ```
   pip install -r requirements.txt
   ```

2. Start the backend server:
   ```
   python server.py
   ```
   You should see:
   ```
   TimeCraft backend running — database file: .../timecraft.db
   * Running on http://127.0.0.1:5000
   ```
   Leave this terminal window open — the server needs to keep running.

3. Open `index.html` in your browser (double-click it, or right-click →
   Open With → your browser). The app will automatically connect to the
   backend at `http://127.0.0.1:5000`.

4. Log in with the default HOD account:
   - Username: `admin`
   - Password: `admin123`

## Notes
- The first time you run `server.py`, it creates `timecraft.db` and seeds
  it with the contents of `data.json` (an empty school setup with just the
  admin account). After that, all changes are saved into `timecraft.db`
  and `data.json` is no longer read.
- If you ever want to reset all data back to empty, stop the server,
  delete `timecraft.db`, and start the server again.
- If the browser shows "Could not connect to backend server", make sure
  `python server.py` is still running in its terminal window.
