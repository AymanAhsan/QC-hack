# Repository Guidelines

## Project Structure & Module Organization

Read `PROJECT.md` for product behavior, `PLANNING.md` for implementation details, and `docs/API.md` for the API contract. `backend/` holds FastAPI (`main.py` registers one router per feature in `backend/routers/`), mock data (`data.py`), the rewards engine (`engine.py`), contract models (`schemas.py`), Gemini (`gemini.py`), and database access (`db.py`). `frontend/src/` holds the shell (`App.tsx`, `navigation.tsx`), the typed client (`api.ts`, `types.ts`), shared components, and one directory per screen under `screens/`. Backend tests live in `backend/tests/`.

## Build, Test, and Development Commands

- Backend install: `cd backend && python -m venv .venv && .venv/Scripts/activate && pip install -r requirements.txt`
- Backend dev server: `cd backend && uvicorn main:app --reload --port 8000`
- Backend tests: `cd backend && python -m pytest`
- Frontend install: `cd frontend && npm install`
- Frontend dev server (LAN-visible, proxies `/api`): `cd frontend && npm run dev`
- Frontend typecheck / build: `npm run typecheck`, `npm run build`

See `README.md` for environment variables and phone testing.

## Coding Style & Naming Conventions

Follow the planned split: keep rewards calculations as pure functions in `backend/engine.py`, mock merchants and cards in `backend/data.py`, and React screens in `frontend/src/screens/`. Use four spaces for Python indentation and two spaces for TypeScript, JSX, and JSON. Name Python modules and functions `snake_case`, React components `PascalCase`, and TypeScript variables and functions `camelCase`. No formatter or linter is configured yet; add its configuration with the first code scaffold.

## Testing Guidelines

Backend tests use pytest (`backend/tests/`). Prioritize deterministic engine tests for network acceptance, reward rates, coupon selection, post-coupon rewards, and missed cash back. Check the $100 Nike stack and Costco's Visa-only ranking from `PLANNING.md`. Add API and screen tests for behavior pure-function tests cannot cover.

## Commit & Pull Request Guidelines

This checkout has no commits, so there is no established commit-message convention. Use short imperative subjects that name the change, such as `Add rewards engine`. In pull requests, summarize the user-visible behavior, cite the relevant planning section or issue, list verification performed, and include screenshots or a short recording for UI changes. Flag any change to reward math or mock payment behavior explicitly.

## Security & Configuration

Keep Gemini keys and Tiger Data connection strings in local environment files; commit only an example file with placeholder values. The payment flow is a simulation and must not claim to charge a card or contact a payment terminal.
