# Training Sessions Workspace

A small React + TypeScript workspace that lets a trainer **view, filter, and create training sessions** against a mock HTTP API. Built as the deliverable for the Frontend Accelerator basic onboarding task ([`frontend-accelerator-onboarding/TASK.md`](frontend-accelerator-onboarding/TASK.md)).

Scope is deliberately small: one list, one status filter, one create flow, and the loading/error states that make those honest. There is no backend — every request is answered by [Mock Service Worker](https://mswjs.io/) behind a single replaceable API boundary.

---

## Contents

- [Quick start](#quick-start)
- [Heads-up: the first list load fails on purpose](#heads-up-the-first-list-load-fails-on-purpose)
- [Scripts](#scripts)
- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Mock API reference](#mock-api-reference)
- [Data model](#data-model)
- [User-visible states](#user-visible-states)
- [Testing](#testing)
- [Design notes](#design-notes)
- [Known limitations](#known-limitations)
- [Accelerator workflow and task artifacts](#accelerator-workflow-and-task-artifacts)
- [Verification status](#verification-status)

---

## Quick start

Requires Node.js and npm. Verified on **Node.js 24.11.1**.

```bash
npm install
npm run dev
```

Vite prints the local URL on start (default `http://localhost:5173`). No extra setup step is needed: the mock service worker script (`public/mockServiceWorker.js`) is committed to the repository, so `npm install && npm run dev` is enough for a fresh clone.

> Regenerate the worker only after upgrading `msw`: `npx msw init public/ --save`.

### Try the flow

1. The first list load **fails on purpose** — you will see an error message and a **Retry** button (see below).
2. Click **Retry**. Three seeded sessions load under the `All` filter.
3. Click `Scheduled`, `Completed`, or `Cancelled` to narrow the list; click `All` to clear it.
4. Click **New session**, enter a title (3–80 characters after trimming) and a future date/time, then submit. The new session appears in the list immediately with status `Scheduled`.

---

## Heads-up: the first list load fails on purpose

`GET /api/sessions` returns **HTTP 500 on the first call after each module load**, then succeeds on every call after that. This is a deliberate, documented mock behavior — not a bug, and not a broken install.

It exists so the `loading → error → retry → success` path is demonstrable without a real backend, in both the browser and the test suite. The mechanism lives in [`src/mocks/handlers.ts`](src/mocks/handlers.ts) (the `listFetchCount` counter) and is exercised by both tests.

To make the app load cleanly on first paint instead, delete the `listFetchCount === 1` branch in `src/mocks/handlers.ts` — note that this will fail [`SessionsWorkspace.test.tsx`](src/features/sessions/SessionsWorkspace.test.tsx) and [`SessionsWorkspace.strictmode.test.tsx`](src/features/sessions/SessionsWorkspace.strictmode.test.tsx), which both depend on the induced failure.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR. Starts the MSW browser worker (dev only). |
| `npm run build` | `tsc -b && vite build` — type-checks both TS projects, then bundles to `dist/`. |
| `npm run preview` | Serves the production build from `dist/`. **No mocks run here** (the worker is dev-only), so the list request has no responder. |
| `npm run lint` | ESLint across the repo (flat config, TS + React Hooks + React Refresh). |
| `npm test` | `vitest run` — behavior-level tests in jsdom against the MSW node server. |

---

## Tech stack

| Concern | Choice | Version |
| --- | --- | --- |
| UI | React (with React Compiler enabled) | 19.2.8 |
| Language | TypeScript | 6.0.3 |
| Build tool | Vite | 8.2.2 |
| HTTP mocking | MSW (browser worker + node server) | 2.15.0 |
| Tests | Vitest + React Testing Library + jest-dom + user-event | Vitest 4.1.11 |
| Lint | ESLint flat config + typescript-eslint | ESLint 10 |

The React Compiler runs through `@rolldown/plugin-babel` with `reactCompilerPreset()` — see [`vite.config.ts`](vite.config.ts). This affects dev and build performance; the test config ([`vitest.config.ts`](vitest.config.ts)) intentionally omits it.

TypeScript uses project references: [`tsconfig.app.json`](tsconfig.app.json) covers `src/`, [`tsconfig.node.json`](tsconfig.node.json) covers the two config files. Neither enables `strict` — a full strict migration was explicitly out of scope for this task.

---

## How it works

```text
src/
├── main.tsx                  # Root render. Starts the MSW worker in DEV only, then mounts <StrictMode>
├── App.tsx                   # Renders <SessionsWorkspace />
├── App.css / index.css       # Styling (plain CSS, nested syntax)
├── api/
│   ├── types.ts              # Session, CreateSessionInput, SESSION_STATUSES
│   └── sessionsApi.ts        # THE request boundary: the only place fetch() is called
├── mocks/
│   ├── handlers.ts           # MSW handlers for GET/POST /api/sessions (+ induced first-call failure)
│   ├── data.ts               # In-memory seed store and id generator
│   ├── browser.ts            # setupWorker(...handlers) — used by main.tsx in dev
│   └── server.ts             # setupServer(...handlers) — used by the test setup
├── features/sessions/
│   ├── SessionsWorkspace.tsx # Owns all state: sessions, load state, error, filter, form visibility
│   ├── SessionsList.tsx      # Presentational list + empty message + date/time formatting
│   ├── StatusFilter.tsx      # All + one-status-at-a-time button group
│   ├── CreateSessionForm.tsx # Local form state, client validation, submit lifecycle
│   ├── SessionsWorkspace.test.tsx            # Behavior test: load → retry → filter
│   └── SessionsWorkspace.strictmode.test.tsx # Regression test: error → retry under <StrictMode>
└── test/setup.ts             # jest-dom matchers, MSW server lifecycle, RTL cleanup
```

**Data flow.** Components never call `fetch` directly:

```text
SessionsWorkspace ──> api/sessionsApi ──> fetch('/api/sessions') ──> MSW handler ──> mocks/data store
   (all state)          (boundary)                                  (dev: worker, test: node server)
```

`SessionsWorkspace` is the only stateful component. It fetches on mount (and on each retry, via a `reloadToken`), holds `sessions` / `loadState` / `errorMessage` / `statusFilter` / `isFormOpen`, and derives `visibleSessions` by filtering in memory — **filtering never issues a request**. Children are presentational and communicate upward through callbacks (`onChange`, `onCreated`, `onCancel`).

Swapping the mock for a real backend means changing only [`src/api/sessionsApi.ts`](src/api/sessionsApi.ts) (and dropping the worker start in `main.tsx`); no component imports `msw` or knows the transport.

---

## Mock API reference

Both endpoints are defined in [`src/mocks/handlers.ts`](src/mocks/handlers.ts). Server-side state is a module-level array in [`src/mocks/data.ts`](src/mocks/data.ts) — it resets whenever the module reloads (page refresh, HMR, new test file).

### `GET /api/sessions`

| Call | Status | Body |
| --- | --- | --- |
| First call after module load | `500` | `{ "message": "Failed to load sessions. Please try again." }` |
| Every later call | `200` | `Session[]` |

### `POST /api/sessions`

Request body: `{ "title": string, "startsAt": string }` (`startsAt` is an ISO 8601 timestamp).

| Condition | Status | Body |
| --- | --- | --- |
| Trimmed `title` shorter than 3 or longer than 80 characters | `400` | `{ "message": "Title must be between 3 and 80 characters." }` |
| `startsAt` missing, unparseable, or not in the future | `400` | `{ "message": "Start date/time must be in the future." }` |
| Valid | `201` | The created `Session` (status `Scheduled`, sequential string id) |

Validation is duplicated on purpose: the client validates first for immediate feedback, and the handler re-validates so the boundary behaves like a real server. Error bodies are surfaced to the UI by `readErrorMessage` in `sessionsApi.ts`, which falls back to `Request failed with status <code>` for non-JSON responses.

### Seed data

Three sessions ship in `src/mocks/data.ts`: *Onboarding Kickoff* (`Scheduled`), *React Fundamentals Review* (`Completed`), *Legacy API Migration Sync* (`Cancelled`).

---

## Data model

```ts
// src/api/types.ts
export const SESSION_STATUSES = ['Scheduled', 'Completed', 'Cancelled'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]

export interface Session {
  id: string
  title: string
  status: SessionStatus
  startsAt: string // ISO 8601
}

export interface CreateSessionInput {
  title: string
  startsAt: string // ISO 8601
}
```

`SESSION_STATUSES` is the single source of truth for the status set: `StatusFilter` renders its buttons by mapping over it, so adding a status extends the filter automatically. Start times are rendered with `Intl.DateTimeFormat` (`dateStyle: 'medium'`, `timeStyle: 'short'`) in the viewer's locale and timezone.

---

## User-visible states

| State | Rendered as | Notes |
| --- | --- | --- |
| Loading | `Loading sessions…` with `role="status"` | Shown on first mount and on every retry. |
| Request error | `role="alert"` region with the server message and a **Retry** button | Retry clears the error and re-issues the request. |
| Loaded | List of cards: title, status, formatted start date/time | |
| Empty | `No sessions match the current filter.` | Also shown when nothing exists at all — see [Known limitations](#known-limitations). |
| Form: invalid title | `Title must be between 3 and 80 characters.` (`role="alert"`) | Checked against the trimmed value; no request is sent. |
| Form: invalid date | `Date and time must be in the future.` / `Date and time are required.` | No request is sent. |
| Form: submitting | Submit button reads `Creating…`; submit, cancel, and both inputs are `disabled` | Prevents duplicate submission while the request is pending. |
| Form: submit failed | `role="alert"` message above the actions | **Typed input is preserved** so the user can correct and resubmit. |

The filter is a `role="group"` of buttons using `aria-pressed` for the active selection, and labels are wired to inputs with `htmlFor` / `id`. Exhaustive accessibility and responsive coverage were out of scope.

---

## Testing

```bash
npm test
```

Two behavior-level tests, both driving the real UI through `user-event` against the real MSW boundary — no component internals or `fetch` stubs:

| File | Covers |
| --- | --- |
| [`SessionsWorkspace.test.tsx`](src/features/sessions/SessionsWorkspace.test.tsx) | Induced failure → **Retry** → all three sessions render → filter to `Completed` (others disappear) → back to `All` (all reappear). |
| [`SessionsWorkspace.strictmode.test.tsx`](src/features/sessions/SessionsWorkspace.strictmode.test.tsx) | Renders inside `<StrictMode>` exactly as `main.tsx` does, and asserts the error state still appears and Retry still recovers. Regression guard for the double-invoked mount effect (see [Design notes](#design-notes)). |

[`src/test/setup.ts`](src/test/setup.ts) registers jest-dom matchers, starts the MSW node server with `onUnhandledRequest: 'error'` (any unmocked request fails the suite), and runs `resetHandlers()` + RTL `cleanup()` after each test. Each test **file** gets a fresh module registry from Vitest's default isolation, which is what keeps the two files' induced-failure expectations independent.

---

## Design notes

**One in-flight list request is shared.** `fetchSessions()` in [`src/api/sessionsApi.ts`](src/api/sessionsApi.ts) memoizes the pending promise and clears it once the request settles. This is not a caching layer — it makes *one user-visible load equal one HTTP call*.

Without it, `<StrictMode>`'s double-invoked mount effect fires two real requests: the first consumes the induced 500, but its state update is dropped because that effect invocation has already been cleaned up (`cancelled === true`), and the second request succeeds. The net effect in `npm run dev` was that the error+retry UI could never be seen. Sharing the request at the boundary fixes it without touching `main.tsx`, `SessionsWorkspace`, or the mock's counter. A mock-side timing heuristic was prototyped and rejected: with `msw/browser`, each handler invocation arrives in its own service-worker message task, so timing-based dedup is unsound in exactly the environment being fixed. Full trace in [`tasks/training-sessions-workspace/review.md`](tasks/training-sessions-workspace/review.md) (Finding 1).

**Filtering is client-side.** The full list is loaded once and narrowed in memory. At this data size a per-filter request would add latency and failure modes for no benefit.

**Mocks are dev-only.** `main.tsx` starts the worker behind `import.meta.env.DEV`, so the production bundle contains no mock wiring. That also means `npm run preview` has no API.

**State is local.** No router, no global store, no data-fetching library — one stateful component and props. Adding any of those would have exceeded the task's stated non-goals.

---

## Known limitations

Carried over from the code review as accepted, non-blocking gaps ([`review.md`](tasks/training-sessions-workspace/review.md) Findings 2–4):

1. **A new session can land outside the active filter.** Created sessions are always `Scheduled`. If the filter is set to `Completed` or `Cancelled`, the form closes with no visible change and no explanation. Creating while on `All` or `Scheduled` behaves as expected.
2. **The empty message assumes a filter.** It always reads *"No sessions match the current filter"*, even when the filter is `All` and there are genuinely zero sessions.
3. **Mock module state is not reset between tests in a file.** `listFetchCount` and `sessionsStore` are plain module-level state, untouched by `server.resetHandlers()`. Harmless today (one test per file), but a second test added to an existing test file would start with the induced failure already consumed and any previously created session still present.

Also intentionally absent per the task's non-goals: session details/deep links, search, multiple simultaneous filters, pagination, edit/delete, auth, CI/deployment, and TypeScript `strict`.

---

## Accelerator workflow and task artifacts

This repository has the Frontend Accelerator toolchain installed. The feature was produced by driving one role at a time and reviewing each result before selecting the next.

Runtime readiness check:

```bash
node ./toolchain/bin/doctor.mjs --json
```

Current top-level result is `BLOCKED`, caused solely by the uninstalled optional `browser` capability (which backs the optional `browser-verify` role). `hooks:claude` is `ACTIVE`; the required role sequence is unaffected.

Task artifacts live in [`tasks/training-sessions-workspace/`](tasks/training-sessions-workspace/):

| Artifact | Contents |
| --- | --- |
| [`requirements.md`](tasks/training-sessions-workspace/requirements.md) | Scope, 16 acceptance criteria, non-goals, assumptions A1–A5. |
| [`implementation-plan.md`](tasks/training-sessions-workspace/implementation-plan.md) | File-level plan, contracts, order of work, verification commands. |
| [`review.md`](tasks/training-sessions-workspace/review.md) | Read-only code review, AC1–AC16 conformance walk, findings and verdict. |
| [`verification.md`](tasks/training-sessions-workspace/verification.md) | Commands run, results, browser evidence, unverified items, verdict. |
| [`workflow-log.md`](tasks/training-sessions-workspace/workflow-log.md) | Every role prompt verbatim, the decision taken after each, and the manual browser observations. |

---

## Verification status

Last verified **2026-08-27** on Node.js 24.11.1:

| Check | Result |
| --- | --- |
| `npm run lint` | **Pass** — 0 errors. One pre-existing warning (`Unused eslint-disable directive`) inside MSW's generated `public/mockServiceWorker.js`. |
| `npm run build` | **Pass** — `tsc -b && vite build`, 26 modules transformed, no type errors. |
| `npm test` | **Pass** — 2 files, 2 tests. |
| Manual browser check (`npm run dev`) | **Pass** — first load shows the induced 500 with the error+retry UI; **Retry** loads the list; filtering narrows correctly; invalid title and past date/time are both rejected with messages; a valid submission appears in the list. |

See [`verification.md`](tasks/training-sessions-workspace/verification.md) for the recorded detail.
