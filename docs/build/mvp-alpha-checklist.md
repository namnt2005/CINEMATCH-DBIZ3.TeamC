# MVP Alpha Checklist

Course: DBIZ3 AI-native Product Development, Session 8 output (input to Session 9)
Team: Team C    Product: CINEMATCH    Date: `<dd/mm/yyyy — day the gates are checked>`
Commit checked: `<first 7 characters>`    Tag: `mvp-alpha`

Save as `docs/build/mvp-alpha-checklist.md`. "MVP Alpha" in DBIZ3 means: the core modules of
the product run end to end on the Session 5 seed data, for their highest-priority user story,
from a clean clone, with the business rules covered by passing tests. It is a course definition.
It is not a market release, and it does not need login, deployment or a polished interface.

> Draft prepared 28/10/2026. Sections 1 and 3 are filled from the repository; the gates in section 2
> stay unticked until two members check them on the commit that will carry the tag.

## 1. Core modules in this Alpha

| Module | P1 user story (from the spec) | Feature folder | Owner | Demo path (URLs or screens, in order) |
|---|---|---|---|---|
| M3 Location Discovery | US-1 Describe a scene, get places that fit | `specs/001-m3-core` | Nguyễn Trần Nam | `/` → `/locations/match` (SC-15: type a scene, confirm what the system understood) → `/locations` (SC-14: ranked cards with match reasons, filters in the URL) |

## 2. Gates

Tick only after checking it at the commit above. Every line must be ticked for `mvp-alpha`.

- [ ] G1. A fresh clone runs with the commands in each `quickstart.md`, on the laptops of at least two members (one macOS and one Windows, if the team has both). Names: `<...>`.
- [ ] G2. The P1 user story of every core module works end to end on the seed data, following the demo path in section 1.
- [ ] G3. Every business rule (BR) of the core modules, and every acceptance scenario of their P1 stories, has an automated test. All tests pass. Last line of the test run: `<...>` (expected: `# fail 0`).
- [ ] G4. `uv run tools/start_feature.py --check` prints OK for every feature folder (the spec snapshot matches `docs/spec/`).
- [ ] G5. `/speckit-analyze` was run after `/speckit-tasks`, and every CRITICAL and HIGH finding is resolved or recorded in section 3.
- [ ] G6. Every change reached `main` through a pull request reviewed by a member who did not write it.
- [ ] G7. No real personal data and no secret (key, password, token) in any committed file.
- [ ] G8. `docs/build/build-log.md` has an entry for every agent run that changed code or tests.

## 3. Known limitations

| # | Limitation | Spec reference | Planned for |
|---|---|---|---|
| 1 | No login: the member role is simulated with the `x-mock-role` header. | SYS F-SYS-01..04; M3 BR-005 | SYS slice (Session 11) |
| 2 | Location detail page `/locations/<slug>` and the gated authority contact are not built (US-2). | M3 F-M3-13..15, SC-16 | Next M3 slice (T028–T042) |
| 3 | Scene extraction is rule-based (`LLM_PROVIDER=mock`); Gemini is not wired yet. | M3 F-M3-11 | M3 US-1 follow-up |
| 4 | Interface is English only; the spec requires Vietnamese and English. | SYS F-SYS-07 | SYS slice |
| 5 | VFDA publishing, comparison and provincial index (US-3, US-4, US-5) are not built. | M3 F-M3-01..05, 16..20 | After `mvp-alpha` |
| 6 | Runs locally on SQLite seed data; not deployed to Vercel or Supabase. | plan.md Complexity Tracking | Session 11 |

## 4. Sign-off

| Member | Role in this Alpha | Agrees the gates are met (yes / no, and why) |
|---|---|---|
| Nguyễn Trần Nam | M3 owner, driver | |
| Trịnh Loan Trang | Test reviewer | |
| Nguyễn Quốc Tuấn | Logger (build log, AI use log) | |
