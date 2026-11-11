# Contract: bilingual drafts, proofreading, glossary, PDF (SC-28)

Feature: `009-m5-dossier` · [research.md](../research.md) R4–R10 · FR-004..FR-006 · BR-001, BR-002, BR-006 · Q3, D2–D4

**All routes**:
- signed in;
- readers are project members, and users of a partner whose request for the project is `accepted` or `confirmed` **with both `nda_acceptance` rows** (D4, M4 NDA gate);
- `404` for anyone else and for a malformed id or `doc_code`;
- `force-dynamic`.

**New codes**: `EMPTY_PARAGRAPH` (422), `TRANSLATION_UNAVAILABLE` (409), `LIMIT` (422).

| Route | Who | Body | Answer |
|---|---|---|---|
| `GET /api/projects/:id/drafts` | readers | | **200** `{ drafts: [{ doc_code, name_vi, name_en, paragraphs, reviewed, pdf: boolean }] }` — picker (SC-28 #3), `A13_SCRIPT_VI` first |
| `GET /api/projects/:id/drafts/:docCode` | readers | | **200** — see *Draft response* below; **200** `{ exists: false }` without a draft |
| `POST /api/projects/:id/drafts/:docCode` | owner or edit | JSON `{ text, consent? }` or `multipart/form-data` `file` (.docx ≤ 4 MB) + `consent` | Splits the text (R4); `app_create_bilingual`; then translation (R5) when allowed. **201** `{ paragraphs, translated, failed: [idx], method: "gemini" \| "mock" \| "none" }`; 422 `drafts.error.text` / `drafts.error.docx` / `NOT_IN_KIT`; 409 `ARCHIVED` |
| `POST /api/projects/:id/drafts/:docCode/translate` | owner or edit | `{ idx?, consent? }` | Translates one paragraph (retry) or every empty one. **200** `{ translated, failed }`; 409 `TRANSLATION_UNAVAILABLE` without the paid plan and the tick, or outside mock mode |
| `PATCH /api/projects/:id/drafts/:docCode/paragraphs/:idx` | owner, edit, or `can_proofread` | `{ target_text }` | `app_edit_paragraph`. **200** `{ idx, status: "machine", slot_state }` — a proofread paragraph goes back to `machine` (US-2 Sc2) |
| `POST /api/projects/:id/drafts/:docCode/paragraphs/:idx/review` | `can_proofread` | | **200** `{ idx, status: "reviewed", reviewed_by_name, reviewed_at, reviewed, total, slot_state }`; 422 `EMPTY_PARAGRAPH`; 403 |
| `POST /api/projects/:id/drafts/:docCode/confirm` | `can_confirm_draft` | | **200** `{ marked, reviewed, total, slot_state: "present" }`; 422 `EMPTY_PARAGRAPH`; 403 for members and for partners whose request is not `confirmed` |
| `POST /api/projects/:id/drafts/:docCode/pdf` | owner or edit | | Renders (R9), stores and saves the path. **200** `{ url, expires_in: 60, pages }` |
| `GET /api/projects/:id/glossary` | readers | | **200** `{ terms: [{ term_en, term_vi }] }` |
| `POST /api/projects/:id/glossary` | owner or edit | `{ term_en, term_vi }` | **201** `{ term_en, term_vi }`; 422 `glossary.error.*`, `LIMIT` |
| `DELETE /api/projects/:id/glossary/:term` | owner or edit | | **204**; 404 |

**Draft response** of `GET /api/projects/:id/drafts/:docCode`:

```text
{ doc_code, structure_version, created_from: "text",
  paragraphs: [{ idx, source_text, target_text,
                 status: "machine" | "reviewed",
                 reviewed_by_name, reviewer_org_name, reviewed_at }],
  reviewed, total, glossary, mismatches: [idx],
  can_edit, can_proofread, can_confirm,
  translation: { available: boolean, consent_needed: boolean, mode: "gemini" | "mock" | "none" },
  pdf_ready: boolean }
```

**Guarantees tested**:
- **US-2 Sc1**: a 14-paragraph English text gives 14 paragraphs, each `machine` (mock translator, offline), shown as *Machine translation · not proofread*.
- **US-2 Sc2**: editing a reviewed paragraph sets `machine` and clears the reviewer; the slot goes `present` → `needs_fix`.
- **US-2 Sc3 and BR-002** on *The Last Ferry*: 13 of 14 reviewed → component b not present (SC-26, SC-27, M0 gauge); the 14th → `present`.
- **Q3**:
  - with `LLM_PROVIDER=gemini` and `GEMINI_PAID_TIER` unset, or `consent` false, the fake Gemini client is never called and `method = "none"`;
  - with `NODE_ENV=production` and `LLM_PROVIDER` unset or `mock`, nothing is translated (`method = "none"`) (U1);
  - with the paid plan and the tick, the client gets the paragraphs and the glossary;
  - the response and the logs never contain the key.
- **Edge case**: one failed batch or a missing paragraph leaves only that `idx` in `failed`, with an empty target. The retry fills it.
- **BR-006**: a term added before a draft appears in the mock output and in the Gemini prompt of every later draft of the project, and of no other project.
- **D4**: a confirmed partner proofreads and confirms (`reviewer_org_id` set); an accepted partner with both NDA rows proofreads only; **an accepted partner without both NDA rows gets 404 on every draft route and never receives `synopsis_en`**; a view member and an unrelated partner get 403 or 404.
- **BR-001**:
  - the PDF tree carries the `fixed` watermark in its only page, and unproofread rows carry the flag;
  - a long draft renders to more than one page;
  - no route or function submits anything to an authority.
- **DOCX**: a `.docx` built in the test with the `docx` library gives the same paragraphs as its text; a 4 MB + 1 file or a non-DOCX is refused.
