# Implementation Plan: Training Sessions Workspace

Task ID: `training-sessions-workspace`
Source: `tasks/training-sessions-workspace/requirements.md` (confirmed), `frontend-accelerator-onboarding/TASK.md`, `frontend-accelerator-onboarding/PASS_CRITERIA.md`
Application Root: repository root (only frontend candidate — single `package.json`, Vite + React 19 + TS, no workspaces).

## Current Behavior

- `src/App.tsx` renders the unmodified Vite starter template (hero/counter demo, "Documentation"/"Connect with us" links). No session data, no HTTP calls, no forms.
- No HTTP client, mock layer, router, or state library exists.
- No test runner is installed; `package.json` has no `test` script.
- `tsconfig.app.json` sets `erasableSyntaxOnly: true` and `verbatimModuleSyntax: true` — TypeScript `enum` and value/type mixed imports are not usable; use `as const` unions and `import type`.
- ESLint flat config (`eslint.config.js`) lints all `**/*.{ts,tsx}` with `typescript-eslint` recommended + `react-hooks` + `react-refresh`; new files must satisfy it as-is (no config changes needed for these rules).
- React Compiler babel preset is active (`vite.config.ts`) — do not hand-write `useMemo`/`useCallback` for the sake of it; write plain idiomatic React.

## Intended Behavior

A single view (`SessionsWorkspace`) replacing the starter content in `App.tsx`:
- On mount, requests sessions through a dedicated API module and shows a loading state, then the list, or a recoverable error state with a retry action.
- A status filter (`All` + one status at a time) narrows the already-loaded list client-side — no extra network call.
- A create form (toggled open/closed) validates title (trimmed, 3–80 chars) and date/time (must be future), disables submit while pending, appends the created session to the list on success, and on failure shows a message while preserving the entered input.
- All network access goes through one `sessionsApi` module; the underlying HTTP calls are intercepted by MSW (browser worker in dev, node server in tests) — no real backend.

## Files To Add

| File | Responsibility |
|---|---|
| `src/api/types.ts` | `SessionStatus` union (`as const` array, not `enum`, per `erasableSyntaxOnly`), `Session`, `CreateSessionInput` types. |
| `src/api/sessionsApi.ts` | The single HTTP-client boundary: `fetchSessions()` (GET) and `createSession(input)` (POST) against `/api/sessions`. Only this module calls `fetch`. Throws a plain `Error` with a UI-safe message on non-OK responses. |
| `src/mocks/data.ts` | In-memory seed array of `Session` (a handful across all statuses, per Assumption A3) and a simple id generator. Mutable module-level array so created sessions persist across requests within a run. |
| `src/mocks/handlers.ts` | MSW `http` handlers for `GET /api/sessions` and `POST /api/sessions` operating on `src/mocks/data.ts`. The GET handler fails the **first** call after each module load (in-memory counter) and succeeds afterward — the deliberate, documented inducible failure from Assumption A5, exercising the loading → error → retry → success path without any extra UI toggle. POST validates minimally server-side (title length, future date) and returns 201 with the created session; no induced failure on POST (kept deterministic so the automated create test is reliable — AC12's failure/retry UI is still implemented and manually verifiable via a devtools offline toggle, not covered by an automated test since AC15 only requires filter-or-create-success coverage). |
| `src/mocks/browser.ts` | `setupWorker(...handlers)` for dev-time interception. |
| `src/mocks/server.ts` | `setupServer(...handlers)` for test-time interception. |
| `src/test/setup.ts` | Vitest setup file: `import '@testing-library/jest-dom'`; `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(() => { server.resetHandlers(); cleanup() })`, `afterAll(() => server.close())`. |
| `src/features/sessions/SessionsWorkspace.tsx` | Top-level container: owns fetch lifecycle (loading/error/data), filter state, create-form open state; wires the pieces below; passes a `retry`/`load` callback down. |
| `src/features/sessions/SessionsList.tsx` | Renders the filtered list (or an empty-list message) as cards/rows showing title, status, human-readable start date/time. |
| `src/features/sessions/StatusFilter.tsx` | `All` + one control per `SessionStatus`; single-select; calls back with the chosen filter value. |
| `src/features/sessions/CreateSessionForm.tsx` | Controlled form (title, date, time or a single datetime-local input); client-side validation for AC8/AC9; disables submit while its own request is pending; calls `sessionsApi.createSession`; reports success (new session) or failure (message, input preserved) to the parent. |
| `src/features/sessions/SessionsWorkspace.test.tsx` | The required behavior-level test (see Essential Tests). |

## Files To Edit

| File | Change |
|---|---|
| `package.json` | Add `"test": "vitest run"` script. Add devDependencies: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw`. |
| `tsconfig.node.json` | Add `vitest.config.ts` to `include` so it's type-checked alongside `vite.config.ts` (same rationale as the existing entry; not an unrelated change). |
| `src/main.tsx` | Before rendering, conditionally start the MSW browser worker when `import.meta.env.DEV` (dynamic import of `src/mocks/browser.ts`, `await worker.start(...)`), then render `<App />`. Keep production render path unaffected. |
| `src/App.tsx` | Replace the starter markup with `<SessionsWorkspace />`. Remove now-unused starter imports (`heroImg`, `reactLogo`, `viteLogo`). Do not touch unrelated files (`favicon.svg`, `icons.svg`) beyond no longer referencing them here. |
| `src/App.css` | Trim/replace starter-template rules that no longer apply (hero/docs/social sections) with minimal layout for the workspace (list, filter, form). Keep this lightweight — visual polish is explicitly out of scope. |

## New Config File

| File | Responsibility |
|---|---|
| `vitest.config.ts` | `defineConfig` from `vitest/config`, `plugins: [react()]` (the same `@vitejs/plugin-react`; the Babel/React-Compiler plugin is not needed for tests), `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: false }`. Kept separate from `vite.config.ts` so the app build config stays untouched — this is the minimal, conventional Vitest setup assumed by A1. |

One-time local setup step (not a source-controlled "file to add" but required before MSW can intercept real `fetch` in the browser): after `msw` is installed, run `npx msw init public/ --save` to generate `public/mockServiceWorker.js`. Record this command in the workflow log/verification notes since it's a required local step, not an implicit one.

## Contracts Between Steps

- `sessionsApi.ts` is the only module other components import for data access; `Session`/`CreateSessionInput`/`SessionStatus` from `api/types.ts` are the shared contract between the API layer, the mock handlers, and the UI components.
- `SessionsWorkspace` owns all request/loading/error/filter/list state; child components (`SessionsList`, `StatusFilter`, `CreateSessionForm`) are presentational/controlled and receive data and callbacks as props — no child calls `sessionsApi` directly except `CreateSessionForm`, which owns its own submit-pending state.
- Mock handlers in `src/mocks/handlers.ts` are imported by both `src/mocks/browser.ts` (dev) and `src/mocks/server.ts` (tests) so dev and test behavior stay identical.

## Order Of Implementation

1. `src/api/types.ts` — no dependencies.
2. `src/api/sessionsApi.ts` — depends on (1).
3. `src/mocks/data.ts`, `src/mocks/handlers.ts` — depend on (1); can proceed in parallel with (2).
4. `src/mocks/browser.ts`, `src/mocks/server.ts` — depend on (3); can proceed in parallel with each other.
5. `package.json` script/devDependency additions, `vitest.config.ts`, `tsconfig.node.json` include, `npx msw init public/ --save` — can proceed any time before step 8 (independent of 1–4).
6. `src/features/sessions/StatusFilter.tsx`, `src/features/sessions/SessionsList.tsx`, `src/features/sessions/CreateSessionForm.tsx` — depend on (1); can proceed in parallel with each other and with (3)/(4).
7. `src/features/sessions/SessionsWorkspace.tsx` — depends on (2) and (6).
8. `src/App.tsx`, `src/App.css` — depend on (7).
9. `src/main.tsx` — depends on (4) (`browser.ts`); can be done any time after (4), independent of (6)-(8).
10. `src/test/setup.ts` — depends on (4) (`server.ts`); needed before (11).
11. `src/features/sessions/SessionsWorkspace.test.tsx` — depends on (7) and (10); written last.

## Essential Tests

- `src/features/sessions/SessionsWorkspace.test.tsx` (the one required behavior-level test, AC15): render `SessionsWorkspace` against the MSW node server, wait for the seeded sessions to appear (this exercises the loading → success path and consumes the one induced list-fetch failure/retry naturally, or explicitly click retry once if the induced failure surfaces first — assert the error state appears, then retry, then data loads), then select a specific status in `StatusFilter` and assert only matching sessions render and an excluded one does not. This covers the filter flow end-to-end against the real mock boundary (no component-internal mocking).
- If time remains, a second test in the same file covering successful creation (open form, fill valid title + future date/time, submit, assert the new title appears in the list and the submit control is disabled during the pending request) may be added — optional per AC15 ("either... or"), not required to pass onboarding.

## Verification Commands

Existing (unchanged):
- `npm run lint`
- `npm run build`
- `npm run dev` (manual browser check: load → observe loading then list or the induced error+retry → filter by one status → open create form → submit a valid future session → confirm it appears in the list)

New (introduced by this plan, per Assumption A1):
- `npm run test` (`vitest run`) — must pass and include the new `SessionsWorkspace.test.tsx`.

Do not invent additional commands; do not require any global/CI installation beyond `npm install` picking up the new devDependencies.

## Rollback / Feature Flag

Not warranted — this is an additive, low-risk onboarding exercise with no existing users or deployed surface. No flag; a plain revert of the added/edited files is sufficient if needed.

## Handoff Notes For `coder`

- Install order matters only for `npx msw init public/ --save`, which needs `msw` present in `node_modules` first.
- Keep the induced list-fetch failure documented with a one-line code comment in `src/mocks/handlers.ts` (why it fails once) so `code-reviewer`/`verify` don't mistake it for a bug.
- Do not add routing, search, pagination, edit/delete, or auth — out of scope per `requirements.md` Non-Goals.
