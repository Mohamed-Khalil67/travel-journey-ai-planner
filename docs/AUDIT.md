# Travel Journey — Code & Algorithm Audit

**Date:** 2026-11-19 · **Scope:** all hand-written JS (~2.3k lines: `backend/`, `frontend/src/`, `tests/`) + a live run in Chrome (mock-AI mode, no Gemini key).
**Demo recording:** [`docs/travel-journey-demo.gif`](travel-journey-demo.gif)

## Verdict

| Area | Score | Notes |
|---|---|---|
| Architecture | 8/10 | Clean layering on both sides; framework-free SPA is a real strength |
| Async / streaming | 8/10 | SSE + async generators + chunk-safe client parser are done right |
| Correctness | 5/10 | 3 confirmed functional bugs, 1 test that breaks on Dec 10 2026 |
| Security | 4/10 | Stored XSS in several views; unauthenticated, un-rate-limited AI endpoint |
| Algorithms / data structures | 7/10 | Right structures chosen; a few cheap wins left |
| Repo hygiene | 3/10 | `node_modules` committed, no root `.gitignore`, no lint/CI |
| **Overall (as-is)** | **~6/10** | **~8/10 after the "Fix before posting" list below** |

## Functional test (Chrome)

| Flow | Result |
|---|---|
| Home → fill form → toggle interests → Generate | ✅ Streams and renders a 7-day plan |
| Save trip → My Trips → View Details | ✅ |
| Edit + save trip notes | ✅ Persists |
| Discover → "Plan Trip" prefills destination | ✅ (via a `setTimeout` hack, see below) |
| Saved Places / Travel Tips / Settings | ✅ Render, navigation and active state correct |
| Photos, avatar, OSM map | ⚠️ Did not load on the test machine (DNS could not resolve Unsplash/pravatar). There's no fallback, so the cards showed broken images |
| Map / weather for a non-Bali city | ❌ Shows Bali coordinates and a fixed 30 °C for Tokyo |

## What's genuinely strong (use these in the post)

1. **End-to-end streaming:** the server uses an `async function*` generator → SSE (`ai.service.js:106`, `ai.controller.js:52-57`). The client reads it with `ReadableStream` + `TextDecoder({stream:true})` and keeps a line buffer that holds back incomplete lines (`api/index.js:24-57`). Many tutorials get this wrong.
2. **Graceful degradation:** it falls back to mock data with no API key, extracts JSON if the model wraps it in prose, renders structured fallback data on a parse failure, and shows a retry button on network errors (`ResultsView.js:184-252`).
3. **Framework-free SPA:** History-API router with `:param` extraction and a 404 fallback (`router/index.js`), plus class-based views.
4. **Data structures:** a `Map`-backed repository gives O(1) get/update/delete by id (`storage-service.js`). A promise-based FIFO `RequestQueue` serializes AI calls (`request-queue.js`).
5. **Layered backend:** routes → controllers → services, plus logger and central error middleware.
6. **Zero-dependency tests** with `node:test`.

## Confirmed bugs (reproduced in the browser)

| # | Bug | Where | Fix |
|---|---|---|---|
| B1 | **Budget allocates 110 %** for `luxury` and `adventure` (2000 → 2200). The unit test asserts the wrong numbers, so it locks the bug in | `utils/budget.js:6-21`, `tests/unit.test.js:49-56` | Make each strategy's 4 percentages sum to 1 (e.g. luxury 0.55/0.2/0.15/0.1). Add a test: `sum === total` for every style |
| B2 | **"Clear All Saved Trips" doesn't clear.** It removes the localStorage key, but the `storageService` singleton still holds the `Map`, so trips stay visible and are written back on the next save | `SettingsView.js:110` | Add `storageService.clear()` (`tripsMap.clear(); saveToStorage()`) and call it |
| B3 | **Stored XSS.** User and AI strings go into `innerHTML`. Saving a trip whose destination is `<img src=x onerror=…>` ran the script on My Trips (verified). The notes `<textarea>` can be broken out of with `</textarea>`. With a real LLM, prompt injection through "Additional notes" can reach these sinks too | `TripsView.js:47`, `TripDetailsView.js:85,89,109-112,133`, `ResultsView.js:237,298-301,345,355,363`, `SavedPlacesView.js:68-77` | Add an `escapeHTML()` helper for every interpolation, or build nodes with `textContent` |
| B4 | **Test time bomb.** The "end before start" test uses `2026-12-10`. After that date the start-date-in-past check fires first and the test fails | `tests/unit.test.js:32-41` | Build dates relative to `new Date()` |

## Other correctness issues

- **Mocked data is presented as real:** geocoding, weather and places always return Bali (`backend/src/services/*.js`). The map and coordinates badge are hard-coded to Bali (`ResultsView.js:286-287`), and the mock itinerary says "Uluwatu cliff walk" for any city. Either label it as demo data, or wire up **Open-Meteo** (free, no key) for weather and **Nominatim** for geocoding. That turns "AI travel planner" into an honest claim.
- **Currency is collected but ignored:** every amount renders with `$` (`ResultsView.js:299,315-331`, `TripDetailsView.js:110,151-167`). Use `Intl.NumberFormat(undefined,{style:'currency',currency})`.
- **Timezone off-by-one:** `valueAsDate = today` writes the *UTC* date (`PlanView.js:165`). Validation compares a UTC-parsed date with *local* midnight (`validation.js:8`). Near midnight, "today" can be rejected as past.
- **Duration counts nights, not days:** Nov 1→6 gives "5 days". `Math.abs` also hides reversed ranges (`utils/dates.js`).
- **Settings are write-only:** name, currency, units and pace are saved but never read anywhere. Also drop the `geminiKey` default (`SettingsView.js:19`); API keys never belong in localStorage.
- **Prefill race:** Discover and Saved Places navigate, then fill the input after `setTimeout(100)` (`DiscoverView.js:98`, `SavedPlacesView.js:104`). Pass the destination through `appStore` or `?destination=` instead.
- **No view teardown:** if you navigate away mid-generation, the stream keeps writing to a detached DOM. Give views a `destroy()` and pass an `AbortController.signal` to `fetch`.
- **Dead or demo-only code:** the Store's pub/sub is never subscribed to. The AbortController "search" in `PlanView.js:168-193` never fetches. The `Set` in `PlanView.js:127` is a no-op (its comment says it's there to demonstrate `Set`). Reviewers notice code that exists only for show, so remove it or make it do something.

## Backend

- `/api/ai/stream` has **no input validation** (an empty `{}` body is accepted; verified with curl). `/generate` validates, but `/stream`, the route the UI actually calls, doesn't.
- A failure *after* streaming starts calls `next(err)` once headers are already sent, which produces `ERR_HTTP_HEADERS_SENT`. Write an `event: error` SSE frame and `res.end()` instead.
- No `req.on('close')` handling, so the Gemini stream keeps running (and billing) after the user leaves.
- `cors()` is wide open and there's no rate limit on a paid AI endpoint. Add `express-rate-limit` and restrict the origin.
- Weather and places lookups are independent but run sequentially (`ai.controller.js:41-43`). Use `Promise.all` once they're real network calls.

## Algorithm & data-structure review

| Spot | Current | Complexity | Better |
|---|---|---|---|
| `getTrips()` sort | Sorts on every call and allocates 2 `Date`s per comparison | O(n log n) per render | ISO strings sort lexicographically: `b.createdAt.localeCompare(a.createdAt)`. Or keep the `Map` in insertion order and reverse it, which is O(n) |
| `saveToStorage()` | Re-serializes every trip on each write | O(n) per write | Fine at this scale. Mention it as a known trade-off (or debounce writes) |
| `RequestQueue` | `Array.shift()` | O(n) dequeue | Irrelevant for a queue of 1–2 items. If you advertise it, use a head index for O(1), and add cancel/clear |
| Router matching | Splits every route on each navigation | O(routes × segments) | Precompile each route to a RegExp once in the constructor |
| Stream accumulation | `fullResponse += chunk; el.textContent = fullResponse` | O(n²) characters copied | Push to an array, or append a `Text` node per chunk |
| JSON extraction | Greedy `/\{[\s\S]*\}/` | O(n) | Fine. Better still, ask Gemini for `responseMimeType: application/json` on the stream call too |
| Debounce | Correct closure-based debounce | — | ✅ |

Overall the data-structure choices are right for the problem. The wins above are polish rather than flaws, so frame them as *"chose Map for O(1) lookup by id"*, not as advanced algorithms.

## Repo hygiene (first thing a recruiter sees)

- **`backend/node_modules` is committed (1,384 files).** Add a root `.gitignore` (`node_modules/`, `.env`, `.idea/`, `dist/`), then run `git rm -r --cached backend/node_modules .idea`.
- Root `package.json` is untracked, so commit it.
- Commit a `backend/.env.example` with `GEMINI_API_KEY=` and `PORT=3000`.
- Heavy inline `style="…"` in JS templates, plus inline `onclick` + a global `window.navigateTo`. Move styles to CSS classes and use event delegation on `[data-route]`.
- Add ESLint + Prettier and a GitHub Actions workflow that runs `npm test`. A green CI badge does a lot for a portfolio project.
- Bundle or self-host images (or add an `onerror` placeholder) so the demo never shows broken cards.
- Decide whether the course PDF belongs in a public portfolio repo.

## Fix before posting (≈2–3 hours)

1. Add `.gitignore` and untrack `node_modules` / `.idea`
2. B3 escape helper (XSS)
3. B1 budget percentages, plus a sum test
4. B2 `storageService.clear()`
5. B4 relative dates in the tests
6. Validation on `/stream` + an SSE error frame
7. Real currency formatting
8. Open-Meteo + Nominatim (or a clear "demo data" label)
9. README: screenshot/GIF, architecture diagram, `.env.example`, "how to run"

## LinkedIn-ready talking points (true today)

- Built a **framework-free SPA in vanilla JavaScript**: custom History-API router with dynamic `:id` params and class-based views.
- **Streamed AI itineraries token by token** with Server-Sent Events: an `async generator` on the Node/Express side and a chunk-safe `ReadableStream` parser in the browser.
- Designed for **graceful degradation**: mock-AI mode without an API key, tolerant JSON extraction, structured fallbacks and retry.
- **Map-backed persistence layer** (O(1) lookups by id) over localStorage, and a **promise-based FIFO queue** to serialize AI requests.
- **Layered Express backend** (routes → controllers → services → middleware) and a zero-dependency `node:test` suite.

After the fixes you can add: *"hardened against XSS, input-validated API with rate limiting, live weather via Open-Meteo, CI on every push."*

---

## Fixes applied (2026-11-20)

| Finding | Status | Where |
|---|---|---|
| `node_modules` / `.idea` committed | ✅ Untracked, root `.gitignore` added | `.gitignore` |
| B1 budget over 100 % | ✅ Strategy table sums to 1; rounding remainder goes to the last bucket | `frontend/src/utils/budget.js` |
| B2 Clear trips resurrected | ✅ `storageService.clear()` clears memory + storage | `storage-service.js`, `SettingsView.js` |
| B3 Stored XSS | ✅ `escapeHTML()` on every dynamic interpolation (verified with `<img onerror>` and `</textarea>` payloads) | `utils/html.js`, all views |
| B4 Test time bomb | ✅ Tests build dates relative to today | `tests/` |
| Hard-coded Bali map/weather | ✅ Open-Meteo geocoding + forecast; UI labels any demo data; no invented coordinates | `backend/src/services/` |
| Currency ignored | ✅ `Intl.NumberFormat` in the trip currency | `utils/format.js` |
| UTC/local date bugs, nights vs days | ✅ Local-date parsing, inclusive day count, DST-safe | `utils/dates.js`, `validation.js` |
| Settings write-only, `geminiKey` in localStorage | ✅ `settingsService` feeds greeting, currency default, °C/°F; key field removed | `services/settings-service.js` |
| `setTimeout` prefill race | ✅ `/plan?destination=…` | Router query params |
| No view teardown / stream cancel | ✅ `destroy()` + `AbortController` end-to-end | `router`, `ResultsView`, `ai.controller.js` |
| `/stream` unvalidated, errors after headers | ✅ Whitelisting validator; in-band SSE `error` frame | `validation/`, `ai.controller.js` |
| Open CORS, no rate limit | ✅ Origin allow-list, 20 KB body cap, token-bucket limiter | `server.js`, `rate-limit.middleware.js` |
| Sequential independent calls | ✅ `Promise.all` for weather + places | `ai.controller.js` |
| Algorithm polish | ✅ Precompiled router, O(n) trip listing, Text-node streaming, memoised formatters | see README table |
| Dead pub/sub, fake search, no-op `Set` | ✅ Store drives settings updates; fake search removed; `Set` is the source of truth | `main.js`, `PlanView.js` |
| Broken remote images | ✅ Global `onerror` placeholder | `main.js`, `public/placeholder.svg` |
| No CI | ✅ GitHub Actions: tests + build on Node 20 & 22 | `.github/workflows/ci.yml` |
| **Bonus:** `.env` was never loaded before services read it | ✅ `import 'dotenv/config'` first | `backend/server.js` |

Tests: 5 → 40 (frontend utils/services, backend validation, rate limiter, AI demo stream, Open-Meteo parsing with mocked `fetch`).

Still open: ESLint/Prettier, inline styles → CSS classes, a real places provider, re-recording the demo GIF.
