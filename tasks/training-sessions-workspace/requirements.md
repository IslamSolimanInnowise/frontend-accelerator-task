# Requirements: Training Sessions Workspace

Task ID: `training-sessions-workspace`
Source: `frontend-accelerator-onboarding/TASK.md`, `frontend-accelerator-onboarding/PASS_CRITERIA.md`

## Application Root

Repository root (`c:\Users\User\Desktop\Innowise\ai-certificate\frontend-accelerator-task`). Confirmed as the only frontend candidate: single `package.json` at root, Vite + React 19 + TypeScript scaffold, no monorepo workspaces.

## Facts (observed in repository)

- Framework: React 19 + Vite 8 + TypeScript (`~6.0.2`), React Compiler babel preset enabled.
- Package manager: npm (`package-lock.json` present).
- Scripts today: `dev`, `build`, `lint`, `preview`. No `test` script exists.
- No test runner, test library, or test config present anywhere in the repo (no Vitest/Jest/RTL in `package.json`, no `vitest.config.*`).
- No HTTP client, data-fetching library, or mock library present (no axios, no MSW, no fetch wrapper).
- No routing, state-management, date, or UI-component libraries installed.
- `src/App.tsx` is the current Vite starter template (counter demo) — none of its content is reusable for this feature.
- No `tasks/` directory existed before this file.
- ESLint config exists (`eslint.config.js`) using typescript-eslint + react-hooks + react-refresh.

## Goal

Let a trainer, in a single-page workspace, view training sessions loaded from a mock API, filter them by one status at a time, and create a new session (title + future date/time) that then appears in the list — implemented against a mock/replaceable HTTP boundary, with loading and recoverable error states, and at least one behavior-level automated test.

## Acceptance Criteria

### Sessions list
1. On load, the app requests sessions through an HTTP-client/request boundary (not inline fake data in the component) and renders them once the request resolves.
2. Each session row/card shows: title, status, and start date/time (human-readable).
3. While the request is pending, a visible loading state is shown instead of an empty or stale list.
4. If the request fails, a single understandable error state is shown, and the user has a recoverable action (e.g., retry) that re-issues the request without a full page reload.

### Filtering
5. A filter control offers an `All` option plus status option(s); selecting a status shows only sessions with that status; selecting `All` shows every session.
6. The filter narrows the currently loaded list (no new required network call), and only one status can be active at a time.

### Create session
7. A create form/entry point can be opened from the workspace.
8. Title is required, trimmed, and must be between 3 and 80 characters; a validation message is shown when violated and the request is not submitted.
9. Date/time is required and must be in the future at submission time; a validation message is shown when violated and the request is not submitted.
10. While the create request is pending, resubmission is prevented (e.g., disabled submit control) so a duplicate session cannot be created by repeated clicks.
11. On success, the newly created session appears in the visible list without a manual page refresh, reflecting the submitted title, status, and date/time.
12. On failure, the user sees a useful message and can retry without losing their entered input.

### Mock boundary
13. All session data (fetch list, create) flows through one HTTP-client-like module/function (e.g., a `sessionsApi`/`client` module) that the rest of the UI calls — not scattered `fetch`/inline literals in components.
14. Since no mock mechanism exists in the repo today, MSW (or another conventional, minimal HTTP mock) is introduced solely to back that boundary. No backend service is implemented.

### Test
15. At least one behavior-level automated test exists covering either the filter flow or the successful-creation flow, using the test tooling introduced for this task (see Assumption A1), and passes when run via the documented command.

### Manual verification
16. The app is started with a documented repository command, and the list → filter → create flow is exercised once in a browser, with the actual observation recorded (not assumed).

## Non-Goals (explicitly out of scope per TASK.md)

- Session details view, drawers, or deep links.
- Search or multiple simultaneous filters.
- Pagination.
- A complete/exhaustive mock API contract or scenario matrix.
- Desktop/mobile screenshot sets or exhaustive responsive/accessibility validation.
- Full test coverage beyond the one required behavior-level test.
- CI, deployment, or a public URL.
- Strict TypeScript migration or unrelated refactoring of `App.tsx`/config beyond what this feature needs.
- Editing or deleting sessions; authentication; multi-user concerns.

## Assumptions

- **A1 — Test stack.** The repository has no test runner today. TASK.md requires "the repository's existing ... test stack," which doesn't exist, and separately says for mocks: "if none exists, MSW or another conventional HTTP mock is acceptable." Applying the same logic, this plan assumes it is acceptable to introduce a minimal, conventional Vite-native stack — **Vitest + React Testing Library** — and add a `test` script, rather than treating the missing test stack as a blocker. This is a reasonably necessary, low-scope addition (dev dependencies + one script), not a rewrite of existing config.
- **A2 — Status values.** TASK.md does not enumerate session statuses. Assumes a small fixed set is sufficient for the exercise (e.g., `Scheduled`, `Completed`, `Cancelled`) with the filter control letting the user pick `All` or exactly one status at a time. Exact labels are a small product/UI decision, not a blocking one.
- **A3 — Mock data seed.** Assumes the mock boundary starts with a small in-memory seed list (a handful of sessions across statuses) so the list, filter, and loading/error states are all observable without a real backend.
- **A4 — Routing/pages.** Assumes no client-side router is needed; list, filter, and create form can live in one view (create form may be inline or a simple toggled section — a UI decision left to `writing-plans`/`coder`, not a blocking product question).
- **A5 — Error triggering.** Assumes the mock boundary needs a deliberate, documented way to simulate a request failure (e.g., an inducible error on list fetch) so the required error state is demonstrable, since there's no real backend to fail naturally.

## Open Questions / Gaps for Specialists

- None rise to a blocking question for this onboarding's small scope. The HTTP-client boundary shape, exact status enum, and whether the create form is a modal/inline section are small enough to be decided directly in `writing-plans` (and, if needed, `ui-designer`) rather than requiring a separate `architect` engagement — per the onboarding guidance to use optional roles only when the task actually needs them.
- If the developer wants firmer product framing (e.g., specific status names, whether statuses imply any workflow) before planning, `brainstorm` is the appropriate role; otherwise Assumption A2 is a safe default to proceed with.

## Readiness

Ready for `writing-plans`. No blocking ambiguity was found; all gaps are resolved by stated, low-risk assumptions (A1–A5) that stay within TASK.md's required scope and constraints.
