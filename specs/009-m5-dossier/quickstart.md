# Quickstart: check the document kit, the bilingual drafts and the countdown (M5)

Feature: `009-m5-dossier` · [plan.md](plan.md) · contracts in [contracts/](contracts/) · data in [data-model.md](data-model.md)

## Prerequisites

- Node.js 22.x, `npm install` done (adds `@react-pdf/renderer` and `mammoth`, named in plan.md); `uv` and Python 3 for the generators.
- Offline runs need no key: `LLM_PROVIDER=mock` (fake translator), node:sqlite with the seed, storage in the OS temp folder.
- Online (`cinematch-dev`):
  - Nam Tran pushes the M5 migration (`npx supabase db push --remote`) and reseeds (`node scripts/seed-supabase.mjs --reset`).
  - The seed owners `lena.park@harbourline.example.kr` (*The Last Ferry*) and `sophie.laurent@lumierenord.example.fr` (*Rice and Salt*), and the seed partner user `lan.pham@benxua.example.vn` (*Bến Xưa Production Service*) must exist in Auth. No temporary account is created. That partner's request for *The Last Ferry* is `accepted`, so the user may proofread but not confirm. The only `confirmed` request in the seed (*Quiet Harbour Blues*, Hạ Long Marine Logistics) has no partner user.
  - Nam Tran signs in in the browser; the agent signs in as no one.
- Real translation needs `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` in `.env`, and `GEMINI_PAID_TIER=true` **only with a paid key** (Q3). Use invented scripts only.

## Offline checks

```bash
python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py   # PASS, git status clean after the D1 generator change
python3 data/schema/load_check.py                                        # PASS
python3 tools/build_supabase.py --check                                  # OK
uv run tools/start_feature.py --check                                    # OK (after --refresh for the §6.1 rows of D1)
npm test                                                                  # all pass, no network
npm run build && npm run build:ci-check                                   # OK (no route prerendered, fonts traced)
```

Expected from `npm test` (each test written and seen failing first): BR-001..BR-006, US-1 Sc1–2, US-2 Sc1–3, US-3 Sc1–2, Q1, Q3 and the edge cases, as listed in plan.md *Constitution Check* II.

## Slice 1 — the document kit (US-1, FR-001..FR-003)

1. As `lena.park@…` (owner), open `/projects/<The Last Ferry>/documents`.
   - Expect three groups.
   - The four Article 13 rows are *Required by law*, with the same states as SC-27.
   - *Foreign crew list* is *Commonly requested*.
   - *Heritage-site management board consent* is *Location-specific*, because Tràng An is shortlisted (US-1 Sc2).
2. Chip C → the segment C list, each item *awaiting VFDA confirmation*, read-only; chip A → back.
3. Drop a 26 MB PDF → refused at the upload area with *25 MB*. Drop a `.png` → refused with the allowed types.
4. Upload an invented PDF for *Undertaking not to breach Article 9* → *Looks like: …* → confirm.
   - Expect the success strip and the row *Present*.
   - SC-27 component d *Present*; the Dossier gauge on SC-12 rises.
5. Replace it → version 2; version 1 is still in the list. Download version 1.
   - In the database (secret key, Nam Tran): one `document_access_log` row for it.
6. A project with no shortlisted location (*Rice and Salt*) → *Added once you confirm a location*.

## Slice 2 — Vietnamese draft and proofreading (US-2, FR-004..FR-006)

1. As `sophie.laurent@…` (owner), `/projects/<Rice and Salt>/bilingual/A13_SCRIPT_VI`: paste an invented 14-paragraph English synopsis → *Create Vietnamese draft* (it replaces the 1-paragraph seed draft after a confirmation).
   - Without the paid plan: 14 paragraphs, Vietnamese empty, *Machine draft not available…*.
   - With `LLM_PROVIDER=mock`: 14 paragraphs *Machine translation · not proofread* (US-2 Sc1).
2. With `LLM_PROVIDER=gemini` and `GEMINI_PAID_TIER=true`:
   - the consent box appears; unticked → no call;
   - ticked → paragraphs arrive (*Translating paragraph n / 14*);
   - with a wrong key → *Could not translate — retry this paragraph* on each, and the retry works after fixing the key.
3. Add the glossary term *ferry → đò*, create the draft again → *đò* in every paragraph that has *ferry* (BR-006). Type a different word in one paragraph → that paragraph is highlighted.
4. Mark paragraphs *✓ Proofread*:
   - at 13 / 14, SC-27 component b is *Needs fixing*;
   - at 14 / 14, the green strip appears and b is *Present* (US-2 Sc3, BR-002);
   - edit one proofread paragraph → *not proofread* and b back to *Needs fixing* (US-2 Sc2).
5. As `lan.pham@benxua.example.vn`, open the *The Last Ferry* draft.
   - *✓ Proofread* works and records the organisation (`accepted`, both NDA rows in the seed — the M4 NDA gate, D4).
   - *Confirm whole document* is not offered.
   - Move the request to `confirmed` through the M4 flow (SC-25: NDA, then the member confirms), reopen the draft → *Confirm whole document* marks the remaining paragraphs in the partner's name (D4).
   - A view member cannot proofread.
6. *Export two-column PDF*:
   - every page shows *DRAFT — REQUIRES PROOFREADING · BẢN NHÁP — CẦN HIỆU ĐÍNH*;
   - Vietnamese diacritics render;
   - paragraphs not proofread are flagged (BR-001).
6b. **NDA gate, by hand** (D4, analysis G2), with existing accounts only:
   1. As `sophie.laurent@…`, send a collaboration request for *Rice and Salt* to *Bến Xưa Production Service* (SC-21 → SC-25). As `lan.pham@…`, accept it; M4 requires the partner's NDA tick, so the request is `accepted` with only the `partner` NDA row.
   2. Still as `lan.pham@…`, open `/projects/<Rice and Salt>/bilingual/A13_SCRIPT_VI` → the *not found* page; `GET /api/projects/<Rice and Salt>/drafts/A13_SCRIPT_VI` in the same browser → 404, and no English text in the answer.
   3. As `sophie.laurent@…`, tick the NDA box on SC-25 (the `producer` row) → *NDA agreed*.
   4. As `lan.pham@…`, reload the draft → it opens; *✓ Proofread* works; *Confirm whole document* is not offered (request not `confirmed`).
   5. `node scripts/seed-supabase.mjs --reset` afterwards puts the seed back.
7. Upload an English `.docx` (invented) instead of pasting → the same paragraphs as its text; a 5 MB `.docx` is refused (4 MB limit).

## Slice 3 — countdown (US-3, FR-007, FR-008; reused from M2)

1. `/projects/<The Last Ferry>/timeline` (15/03/2027, buffer 7):
   - *Recommended submission date* 05/01/2027, latest 02/02/2027;
   - filing on 02/02/2027 with one resubmission → result 02/04/2027, after the first shooting day (US-3 Sc1);
   - the Tết 2027 band *expected* (US-3 Sc2).
2. `GET /api/projects/<The Last Ferry>/countdown` (signed in, in the browser) returns the same `timeline_view` as SC-29; SC-12, SC-27 and SC-29 show the same dates (BR-005). *Quiet Harbour Blues* → passed, in red, with *Book a VFDA consultation*.
3. Phone width 360 px on SC-26, SC-29; SC-28 at 768 px (two columns) and 360 px (one column), in an iframe of that width (build-log Entry 10).

## Results

*(filled in by the person who runs it)*

**11/11/2026 — baseline before any M5 code (T001), run by Claude Code for Nam Tran** (branch `009-m5-dossier`, last commit `6821e4f`; uncommitted: the M5 design documents and the test-only run)

| Check | Result |
|---|---|
| `npm test` | 1031 tests, 1020 passed, 11 failed — the 11 are the new M5 tests of the test-only run (red by design) |
| `npm run build` | OK |
| `npm run build:ci-check` | OK |
| `uv run tools/start_feature.py --check` | OK |
| `python3 data/seed/check_seed.py` | PASS |
| `python3 data/schema/load_check.py` | SQLite PASS — 49 tables, 458 rows |
| `python3 tools/build_supabase.py --check` | OK |

**11/11/2026 — offline close-out of the code run, run by Claude Code for Nam Tran** (branch `009-m5-dossier`, last commit `6821e4f`; everything uncommitted; nothing run online)

| Check | Result |
|---|---|
| `npm test` | 1123 tests, 1123 passed, 0 failed |
| `npm run build` / `npm run build:ci-check` | OK / OK (no route prerendered; the PDF route traces `lib/pdf/fonts/**` and loads `@react-pdf/renderer` from node_modules) |
| `uv run tools/start_feature.py --check` | OK |
| `python3 tools/build_supabase.py --check` | OK |
| `python3 data/seed/check_seed.py` | PASS |
| `python3 data/schema/load_check.py` | SQLite PASS — 50 tables, 463 rows |
| `node scripts/check-i18n.mjs`, hard-coded text, banned words | complete / pass / pass |
| PGlite (HEAD shape and D1 shape) | migration `20261111000100` twice on each; NDA gate (Lan reads 14 paragraphs with both NDA rows, 0 without); upload v1 → v2, slot present, d present in `v_dossier_check`; refusals (view member, archived, foreign path, `..`, notice copy); 13/14 → b needs_fix, 14/14 → present, an edit → needs_fix; Lan's paragraph records her organisation; confirm refused while accepted, done once confirmed; one glossary row per term |
| PDF of 14 paragraphs | 132 ms cold, 50 ms warm, 3 pages; watermark drawn on every page (renderer callback), diacritics checked by eye on page 1 |
| Not run (online, Nam Tran) | `npx supabase db push --remote`, `node scripts/seed-supabase.mjs --reset`, `npm run test:rls` (T019, T037), `npm run check:supabase`, slices 1–3 and step 6b in the browser, 360 / 768 px (T051 layout part) |

