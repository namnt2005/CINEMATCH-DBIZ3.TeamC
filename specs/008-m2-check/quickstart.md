# Quickstart: check the rule base, the pre-check, the dossier and the timeline (M2)

Feature: `008-m2-check` · [plan.md](plan.md) · contracts in [contracts/](contracts/) · data in [data-model.md](data-model.md)

## Prerequisites

- Node.js 22+, `npm install` done; `uv` and Python 3 for the generators.
- Offline runs need no key: `LLM_PROVIDER=mock` (keyword match), node:sqlite with the seed.
- Online (`cinematch-dev`): Nam Tran pushes the M2 migration (`npx supabase db push --remote`) and reseeds (`node scripts/seed-supabase.mjs --reset`); the seed Legal Board account `quan.tran@vfda-demo.example.vn` and the seed member `yui.tanaka@…` must exist in Auth. Nam Tran signs in in the browser; the agent signs in as no one.
- For a real model run: `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL` in `.env`, and `GEMINI_PAID_TIER=true` only with a paid key (R3). Use invented summaries only.

## Offline checks

```bash
python3 data/seed/generate_seed.py && python3 data/seed/check_seed.py   # PASS, git status clean after the D2–D4 generator change
python3 data/schema/load_check.py                                        # PASS
python3 tools/build_supabase.py --check                                  # OK
uv run tools/start_feature.py --check                                    # OK (after --refresh for D1, D2, D4 at the sources)
npm test                                                                  # all pass, no network
npm run build                                                             # OK
```

Expected from `npm test` (each written and seen failing first): BR-001..BR-008, US-1 Sc1–3, US-2 Sc1–2, US-3 Sc1–2, US-4 Sc1, Q3, Q6, Q13 as listed in plan.md *Constitution Check* II.

## Slice 1 — the Legal Board signs a rule (US-3, FR-001..FR-004)

1. As `quan.tran@…` open `/admin/legal-rules`: 9 seed codes, version `2026.08`, filters by topic and status.
2. Open the draft `A9-HERIT` (no citation), click *Approve and sign* → *Cannot sign — citation missing*, citation outlined; the rule stays *Draft* (US-3 Sc1, BR-002).
3. Enter a citation, sign → *A9-HERIT signed — rule set 2026.11 is now in force*; the history shows `2026.11` (US-3 Sc2, D6). The owners of projects whose latest content check used `2026.08` get *New rule set* in Notifications; their Content gauge loses 30 points (Q3).
4. On an approved rule, *Create revision* → revision 2 as draft; `/pre-check` still uses revision 1 until revision 2 is signed (Q13).
5. *Retire* `A9-HERIT` → a new version `2026.11.02` (Q13); the rule leaves future checks; the audit log has one row per save, revision, signature and retirement.
6. As the seed member: `/admin/legal-rules` refused.

## Slice 2 — pre-check without an account (US-1, FR-005..FR-007, FR-011..FR-014)

1. Signed out, open `/pre-check`; paste an invented 96-word summary that mentions a border post and soldiers; *Check content* → SC-48 in under 30 s: level, highlighted numbered passages, one card per finding with citation, code and *Points to consider* (US-1 Sc1).
2. With a 19-word summary the button stays disabled; with 201 words the counter is red.
3. A summary with nothing to flag → *Low* and *No points needing attention were found under rule set {v}*; no *approved*, *safe*… in either language (US-1 Sc3, BR-003).
4. In the database (secret key, Nam Tran): the new `precheck_run` has a hash, no text; its `precheck_finding` rows have `rule_id` and span only (Q6).
5. Close the tab, reopen the result link → level and cards, *the text is not kept* (D3).
6. Sign in as the seed member, re-check, *Save to project* → choose *Lantern Street* → `/projects/…/content` lists the findings with their passages; *Mark reviewed* with a note; the Content gauge on SC-12 rises (FR-014).
7. With `LLM_PROVIDER=gemini` and a paid key: the same summary; with a wrong key the result says *checked by keyword matching* (R3).

## Slice 3 — dossier (US-2, FR-008..FR-010)

1. `/projects/<Rice and Salt>/dossier` → 1 / 4, *Not ready to submit*, three missing components with their actions (US-2 Sc1).
2. `/projects/<The Last Ferry>/dossier` → component b *Needs fixing* (paragraphs not proofread), not *Present* (US-2 Sc2); c *Pending*.
3. The Dossier gauge on SC-12 shows the same percentage as SC-27 for every seed project (FR-010).
4. A segment C project (*Monsoon Signal*) → no Article 13 table.

## Slice 4 — timeline (US-4, FR-017, FR-018)

1. `/projects/<The Last Ferry>/timeline` (15/03/2027, buffer 7) → latest **02/02/2027**, safe **05/01/2027**; the Tết 2027 band (05–10/02, *expected*) inside the window; both paths shown (US-4 Sc1, D1).
2. Change the buffer to 14 → both dates move earlier; SC-12 shows the same dates (SR-173).
3. *Quiet Harbour Blues* (10/11/2026) → *Safe submission deadline passed … days ago* and the consultation button.
4. Segment C → *no countdown*; no shooting day → the date field.
5. Phone width 360 px on all five screens (in an iframe of that width, build-log Entry 10).

## Results

*(filled in by the person who runs it)*
