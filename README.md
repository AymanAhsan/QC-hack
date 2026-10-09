# CardMax: Credit Card Optimizer (hackathon demo)

Pick the best card in your wallet for every purchase, stack the best coupon on top, and see the rewards you missed. See [PROJECT.md](PROJECT.md) for the product, [PLANNING.md](PLANNING.md) for the plan, and [docs/API.md](docs/API.md) for the API contract.

> **Everything is simulated.** Cards, stores, locations, coupons, payments, and transaction history are demo data. No real payment is processed and no coupon is a verified offer.

## Stack

- Frontend: React + Vite + TypeScript PWA, Tailwind CSS, Motion (`frontend/`)
- Backend: FastAPI, Python 3.12 (`backend/`)
- AI: Gemini for cart screenshots and simulated coupons (offline fallbacks included)
- Database: Tiger Data (Postgres + TimescaleDB), or local SQLite

## Run locally

Two terminals. Requires Python 3.12+ and Node 20+.

**Backend** (http://127.0.0.1:8000, docs at /docs):

```bash
cd backend
python -m venv .venv
# Windows:      .venv\Scripts\activate
# macOS/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # optional: add GEMINI_API_KEY / DATABASE_URL
uvicorn main:app --reload --port 8000
```

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api` to the backend, so no frontend env file is needed.

### Test on a phone

This is a web app (PWA), not an Expo/React Native app, so it does not run in Expo Go. Open it in the phone's browser instead:

1. Phone and computer on the same Wi-Fi.
2. Start both servers as above. `npm run dev` prints a `Network:` URL such as `http://192.168.1.23:5173`.
3. Open that URL in Safari (iPhone) or Chrome (Android).
4. Optional: Share → **Add to Home Screen** for a full-screen, app-like launch.

If the phone cannot connect, allow Node.js through the Windows firewall on private networks (Windows prompts the first time `npm run dev` runs), or check that the Wi-Fi isn't a guest/isolated network. The backend can stay on `127.0.0.1`; the phone only talks to Vite.

## Checks

```bash
cd backend && python -m pytest          # engine + API tests
cd frontend && npm run typecheck        # TypeScript
cd frontend && npm run build            # production build
```

## Environment variables

Backend (`backend/.env`, see `backend/.env.example`):

| Name | Default | Purpose |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed browser origins |
| `GEMINI_API_KEY` | empty | Gemini key; empty = offline fallbacks |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Gemini model name |
| `GEMINI_TIMEOUT_S` | `20` | Gemini request timeout |
| `MAX_UPLOAD_BYTES` | `5242880` | Screenshot upload limit |
| `DATABASE_URL` | empty | Tiger Data connection string; empty = SQLite |
| `SQLITE_PATH` | `backend/demo.sqlite3` | SQLite file |
| `ALLOW_SQLITE_FALLBACK` | `false` | Explicitly allow SQLite if Tiger Data is unreachable at startup |
| `SEED_DEMO_DATA` | `true` | Seed ~30 demo purchases on first start |

Frontend (`frontend/.env.local`, optional): `VITE_API_BASE_URL` (empty = same origin), `VITE_PROXY_TARGET` (dev proxy target).

Secrets live only in `backend/.env`, which is git-ignored.

## Team ownership

| Area | Owner | Files |
|---|---|---|
| Foundation, engine, integration | Omar | `backend/{main,config,data,engine,schemas,serializers,services,errors}.py`, `backend/routers/{wallet,recommend,stack,deals}.py`, `frontend/src/{App,api,types,navigation}.tsx?`, `frontend/src/components/{TabBar,DevStatus,ui}.tsx`, docs |
| Wallet | Yousef | `frontend/src/screens/wallet/` |
| Persistence, Missed | Ayman | `backend/db.py`, `backend/routers/{transactions,missed}.py`, `frontend/src/screens/missed/` |
| Gemini, Scan, Deals | Nazeef | `backend/gemini.py`, `backend/routers/cart.py`, `frontend/src/screens/{scan,deals}/` |

Shared contract changes (API fields, `types.ts`, dependencies) go through a PR that updates `docs/API.md`, `backend/schemas.py`, and `frontend/src/types.ts` together.
