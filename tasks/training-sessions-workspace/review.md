# Code Review: Training Sessions Workspace (commit 28dc741)

**Base:** `git diff HEAD~1 HEAD` — `src/api/`, `src/features/sessions/`, `src/mocks/`, `src/test/setup.ts`, `src/main.tsx`, `src/App.tsx`/`App.css`, config files.
**Requirements:** `tasks/training-sessions-workspace/requirements.md`
**Plan:** `tasks/training-sessions-workspace/implementation-plan.md`

## Findings

### 1. [Should-Fix — RESOLVED 2026-08-27] Induced-failure mock is defeated by `<StrictMode>` in the actual dev environment, undermining Assumption A5 and manual verification (AC16)

**Resolution:** Fixed in commit `f40ddc5` — `src/api/sessionsApi.ts` now shares one in-flight list request between concurrent callers, so `<StrictMode>`'s double-invoked mount effect produces a single request/response pair instead of two, and the non-cancelled effect invocation renders the error state. A follow-up code-reviewer pass confirmed the fix's reasoning holds in a real browser (not just jsdom) and introduces no new defect. The developer then re-ran `npm run dev` and confirmed directly: first load now shows the induced 500/error+retry UI, and clicking the in-app Retry button loads the list successfully — closing the AC16 gap this finding identified. See the "Re-verification after StrictMode fix" entry in `frontend-accelerator-onboarding/workflow-log.md` for the recorded observation.

Original finding, preserved for context: 

**Files:** `src/mocks/handlers.ts:9-26`, `src/features/sessions/SessionsWorkspace.tsx:19-37`, `src/main.tsx:16-18`

`handlers.ts` fails only the *first* `GET /api/sessions` call after module load (`listFetchCount`, line 9/19), specifically so the loading→error→retry→success path is "demonstrable without a real backend" (comment, lines 5-8). `main.tsx` still wraps `<App />` in `<StrictMode>` (line 16), which is unchanged from the starter template and still active.

In React 18/19 dev builds, `StrictMode` mounts, cleans up, and re-mounts effects once on initial mount. `SessionsWorkspace`'s data-fetching effect (lines 19-37) has no re-entrancy guard beyond a local `cancelled` boolean scoped to each effect invocation — it does not prevent a second real `fetch()` from firing. Sequence when running `npm run dev`:

1. Effect run #1 calls `fetchSessions()` → real request → `listFetchCount` becomes 1 → mock returns 500.
2. React immediately runs the effect #1 cleanup (`cancelled = true`) and re-invokes the effect (effect run #2).
3. Effect run #2 calls `fetchSessions()` again → `listFetchCount` becomes 2 → mock returns 200 with data.
4. Effect #1's 500 response resolves into a closure where `cancelled` is already `true`, so `setLoadState('error')` is never called. Effect #2's success response updates state normally.

Net effect: on every fresh page load in the actual browser (the environment named in the Verification Commands / AC16 manual check), the user deterministically sees the list load successfully and **never sees the error+retry UI** that Assumption A5 was introduced specifically to make "demonstrable." The error/retry path is only exercised by the automated test (`SessionsWorkspace.test.tsx`), which renders without `StrictMode` and therefore only fires the effect once.

This doesn't break AC4 as a behavior (it's proven by the test), but it does mean the plan's own manual-verification note ("observe loading then list *or the induced error+retry*") cannot be satisfied by induced failure in the one place — the real dev server — where a human is expected to look, and the code comment's claim about what's "demonstrable" is inaccurate for that environment.

This is corroborated by the recorded Manual Browser Observation in `frontend-accelerator-onboarding/workflow-log.md`: the developer's observed flow describes the list loading successfully and filtering/creating working, with no mention of ever seeing the error+retry state — consistent with the mechanism above always masking it in the browser.

### 2. [Minor] Newly created session can silently disappear from view if the active filter excludes "Scheduled"

**File:** `src/features/sessions/SessionsWorkspace.tsx:45-48`, `src/mocks/handlers.ts:49`

`handleCreated` appends the new session to `sessions` and closes the form but does not reset `statusFilter`. The mock server always creates sessions with `status: 'Scheduled'`. If a trainer has filtered to `Completed` or `Cancelled` and then creates a session, `visibleSessions` (line 51) excludes it — the create form closes with no visible change and no message explaining why. AC11 requires "the newly created session appears in the visible list without a manual page refresh"; as implemented, that only holds when the active filter is `All` or `Scheduled`.

### 3. [Minor] Empty-list copy is misleading when there is no active filter

**File:** `src/features/sessions/SessionsList.tsx:17-19`

The zero-results message always reads "No sessions match the current filter," even when `statusFilter === 'All'` and there are genuinely zero sessions overall (e.g., after the seed changes in the future). The message presumes a filter is narrowing results, which isn't always true.

### 4. [Note — residual test-fragility risk] Mock module state isn't reset between tests

**File:** `src/test/setup.ts:8-11`, `src/mocks/handlers.ts:9`, `src/mocks/data.ts`

`afterEach` calls `server.resetHandlers()` and RTL `cleanup()`, but `listFetchCount` (handlers.ts:9) and `sessionsStore` (data.ts) are plain module-level mutable state, not MSW handler state — `resetHandlers()` does not touch them. With only one `it` block today this causes no failure, but the very next test added to this file (e.g., the optional create-flow test the plan flags as "if time remains") will start with `listFetchCount` already at 2 (so its first GET succeeds immediately instead of failing) and `sessionsStore` already containing whatever the prior test created/left behind. This isn't a defect in the shipped diff, but it's a landmine for the next person who extends this test file, worth calling out per the "residual gaps" review duty.

## Requirements/Plan Conformance Check

Walked every acceptance criterion (AC1-AC16) against the diff:

- **AC1-AC4 (list load/loading/error/retry):** Implemented via `sessionsApi.fetchSessions` + `SessionsWorkspace` state machine. Functionally correct and proven by the test — see Finding 1 for the caveat on manual/dev demonstrability.
- **AC5-AC6 (filter):** Correctly implemented as client-side derivation (`visibleSessions`, no extra fetch), single-select via `StatusFilterValue`.
- **AC7-AC10 (create form, validation, disabled-while-pending):** Implemented correctly in `CreateSessionForm.tsx` — trimmed 3-80 char title check, future-date check, `disabled={isSubmitting}` on submit and inputs.
- **AC11 (success appends to visible list):** Mostly satisfied — see Finding 2 for the filtered-view edge case.
- **AC12 (failure preserves input):** Satisfied — form state isn't cleared on catch.
- **AC13-AC14 (single API boundary, MSW-only mocking):** Satisfied — grepped the diff; only `src/api/sessionsApi.ts` calls `fetch`, no backend implemented.
- **AC15 (one behavior-level test):** Satisfied — `SessionsWorkspace.test.tsx` covers the filter flow end-to-end against the real MSW boundary, including the induced failure/retry path.
- **AC16 (manual verification recorded):** Not code, so not reviewed as a diff item at the time — Finding 1 correctly identified that the recorded observation could not have shown the error state as the plan intended, since `<StrictMode>` was masking it. As of the `f40ddc5` fix and the developer's follow-up `npm run dev` re-check (recorded in the workflow log), the error+retry state is now observed and AC16 is satisfied.
- **Non-Goals:** No evidence of scope creep — no routing, search, pagination, edit/delete, or auth added.

No requirement or plan item is silently unmet; Findings 1-3 were gaps in robustness/UX polish against the stated ACs, not missing features. Finding 1 is now resolved (see above); Findings 2-4 remain open.

## Verdict

**PASS** (updated 2026-08-27, after Finding 1's resolution) — the one Should-Fix finding is resolved and verified in a real browser, not just by the automated test. Findings 2 and 3 are minor UX/copy gaps and Finding 4 is a residual test-fragility risk; none are blocking, but they remain open and should be tracked if this workspace is extended further.

**Residual gaps not covered by this diff's tests:** creation-flow success/failure path (optional per AC15, not implemented), and the cross-test mock-state isolation risk noted in Finding 4.

Original verdict, preserved for context: NEEDS-CHANGES, blocked on Finding 1 (StrictMode defeating the induced failure in `npm run dev`), routed to `debugger`.
