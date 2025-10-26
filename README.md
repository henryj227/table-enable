# Table Enable

Frontend + backend split with a simple file-based interface for occupancy status.

## Structure

- `frontend/` — React + Vite app that renders the floorplan and polls `occupancy.json`.
- `backend/` — Python YOLO script that detects occupancy from a webcam and writes `occupancy.json`.
- Root — shared docs/config like this `README.md` and `.gitignore`.

## Data Flow

`backend/table_occupancy.py` writes `frontend/public/occupancy.json` on a cadence. The frontend fetches that file from the same origin at `/occupancy.json` and renders table statuses.

## Frontend (Vite + React)

Setup and run the dev server:

```bash
cd frontend
npm install
npm run dev
```

By default the app fetches `/occupancy.json`. You can override with an env var:

```bash
# .env (or export before running dev)
VITE_OCCUPANCY_URL=https://your.cdn/path/occupancy.json
```

Build for production:

```bash
npm run build
npm run preview
```

## Backend (Python + YOLOv8)

Dependencies:

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate  # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Annotate zones (click to add points, press `n` to close a polygon, `s` to save, `q` to quit):

```bash
python table_occupancy.py annotate --camera 0
```

Run detection (writes `../frontend/public/occupancy.json` periodically):

```bash
python table_occupancy.py run --camera 0
```

Notes:
- Edit `CAM_INDEX` or pass `--camera` to choose your webcam.
- The script saves `zones.json` next to `table_occupancy.py` and writes `occupancy.json` to `frontend/public/`.

## Deploying with a Cloud Host

- Option A: Publish `occupancy.json` to a CDN (S3/CloudFront, Azure Blob) and set `VITE_OCCUPANCY_URL` to that URL. Ensure CORS allows your site origin and disable caching or version the file.
- Option B: Serve `occupancy.json` from the same origin as the site (e.g., copy to your web root on deploy) to avoid CORS entirely.

## File Conventions

- Floorplan image is in `frontend/public/floorplan.jpg` and referenced by the app as `/floorplan.jpg`.
- Ignore files are configured in `.gitignore` for `frontend/node_modules`, `backend/zones.json`, and `frontend/public/occupancy.json`.
