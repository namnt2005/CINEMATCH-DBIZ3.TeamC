# Contract: content pre-check (SC-03, SC-48)

Feature: `008-m2-check` · [research.md](../research.md) R2, R3, R7, R12, R14 · FR-005..FR-007, FR-011..FR-014 · BR-001, BR-003, BR-004, BR-007 · Q4, Q6

Error bodies: `{ error, message, fields? }` — `message` is the English text of a dictionary key; screens translate from `error` and the field keys. No answer or log line carries the summary text, the IP or the Gemini key.

| Route | Who | Body / query | Answer |
|---|---|---|---|
| `GET /api/precheck/basis` | anyone | | **200** `{ rule_version, approved_count }` — SC-03 #10 |
| `POST /api/precheck` | anyone (rate-limited, R12) | `{ text, lang: "en" \| "vi", flags?: { real_person, military, heritage_site } }` | **200** see below. **422** `VALIDATION_ERROR` `fields.text = precheck.error.words` (< 20 or > 200 words), `fields.lang`, `fields.flags`. **429** `RATE_LIMITED`. **503** `CHECK_UNAVAILABLE` (matcher and fallback both failed; nothing stored) |
| `GET /api/precheck/:id` | anyone with the id | | **200** `{ brief_id, rule_version, lang, created_at, attention_level, counts, findings: [{ n, rule_code, revision, severity, title_vi, title_en, citation, description_vi, description_en, guidance_vi, guidance_en, span_start, span_end }] }` — no text (D3); **404** unknown or malformed id |
| `POST /api/projects/:id/content-checks` | signed in, owner or edit, project not archived | `{ text, lang, rule_version, findings: [{ rule_code, quoted_text }] }` | **201** `{ run_id, rule_version, findings: n }` after re-verifying every finding (R7). 401, 403 (`FORBIDDEN`), 404, 409 `ARCHIVED`, 409 `RULE_SET_CHANGED`, 422 |

`POST /api/precheck` answer (200):

```text
{
  brief_id, rule_version, method: "model" | "keywords",
  state: "findings" | "none" | "could_not_check",
  attention_level: "low" | "medium" | "high" | null,     // null only when state = could_not_check
  counts: { action, notice }, dropped_count,
  findings: [{ n, rule_code, revision, severity, title_vi, title_en, citation,
               description_vi, description_en, guidance_vi, guidance_en,
               quoted_text, span_start, span_end }]       // quoted_text only in this answer, never stored
}
```

Guarantees tested:
- every finding's `rule_code` is an approved, active revision of `rule_version` with a citation and an approver, and `text.slice(span_start, span_end) === quoted_text` (BR-001, FR-012);
- unknown code, unsigned or retired rule, quote not in the text → dropped and counted (US-1 Sc2);
- the level follows Q4 exactly (BR-004); `state = none` → `attention_level = low` and the message *No points needing attention were found under rule set {rule_version}* (US-1 Sc3); all dropped → `could_not_check`, no level;
- no banned word in any message of either language (BR-003);
- stored: one `precheck_run` with `synopsis_hash` (SHA-256), lang, flags, level, version, and per finding `rule_id`, span — never text (Q6, FR-007, BR-007);
- `LLM_PROVIDER=mock` or no paid Gemini key → `method = keywords`; a Gemini error → `method = keywords` (R3).
