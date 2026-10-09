# Repository Guidelines

## Project Structure & Module Organization

This repository currently contains specifications for the Credit Card Optimizer demo. Read `PROJECT.md` for product behavior and `PLANNING.md` for implementation details. The planned layout is `backend/` for FastAPI, mock data, rewards, Gemini, and database access; `frontend/src/` for React screens, components, and API helpers; and `frontend/public/` for PWA assets. These directories do not exist yet. Put tests beside the code or in `tests/` directories.

## Build, Test, and Development Commands

There is no runnable app, dependency manifest, or test command yet. Use `rg --files` to list project files and `git status --short` to review local changes. When adding Vite and FastAPI, document the configured install, development, build, and test commands here.

## Coding Style & Naming Conventions

Follow the planned split: keep rewards calculations as pure functions in `backend/engine.py`, mock merchants and cards in `backend/data.py`, and React screens in `frontend/src/screens/`. Use four spaces for Python indentation and two spaces for TypeScript, JSX, and JSON. Name Python modules and functions `snake_case`, React components `PascalCase`, and TypeScript variables and functions `camelCase`. No formatter or linter is configured yet; add its configuration with the first code scaffold.

## Testing Guidelines

No test framework or coverage threshold has been selected. Prioritize deterministic engine tests for network acceptance, reward rates, coupon selection, post-coupon rewards, and missed cash back. Check the $100 Nike stack and Costco's Visa-only ranking from `PLANNING.md`. Add API and screen tests for behavior pure-function tests cannot cover.

## Commit & Pull Request Guidelines

This checkout has no commits, so there is no established commit-message convention. Use short imperative subjects that name the change, such as `Add rewards engine`. In pull requests, summarize the user-visible behavior, cite the relevant planning section or issue, list verification performed, and include screenshots or a short recording for UI changes. Flag any change to reward math or mock payment behavior explicitly.

## Security & Configuration

Keep Gemini keys and Tiger Data connection strings in local environment files; commit only an example file with placeholder values. The payment flow is a simulation and must not claim to charge a card or contact a payment terminal.
