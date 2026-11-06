# Contract: partner invitations (BR-003, D2)

Feature: `007-m4-partners` · [research.md](../research.md) R2 · Open questions 2, 3, 9 · SYS BR-002 as changed 06/11/2026 (SYS question 6): `vfda_staff` and `admin` invite; accepting grants `partner`

| Route | Who | Body | Answer |
|---|---|---|---|
| `POST /api/admin/partner-invitations` | `vfda_staff`, `admin` (403 for `member`, `partner`, `vfda_legal`) | `{ org_id? , org?: { org_name, legal_form, hq_province?, service_groups, provinces }, email }` | **201** `{ invitation_id, org_id, expires_at, email: "sent" \| "queued" \| "failed" }` — creates the organisation's public layer when `org` is given (slug from the name, accents removed), the invitation (code hash only), one `audit_log` row `partner.invite`, then emails the one-time link `/invitations/partner/<code>` through Resend. The code is never returned by the API or logged. 422 for a bad email or organisation fields; 409 `INVITATION_OPEN` when an open invitation exists for the same email and organisation |
| `GET /api/admin/partner-invitations` | `vfda_staff`, `admin` | | **200** `{ invitations: [{ invitation_id, org_name, email, invited_at, expires_at, state: "open" \| "accepted" \| "expired" }] }` |
| `GET /api/partner-invitations/:code` | anyone | | **200** `{ org_name, email_hint: "l***@benxua.example.vn", state }` — enough to show the page, not the full address; 404 for an unknown code |
| `POST /api/partner-invitations/:code/accept` | the signed-in invited account | | **200** `{ role: "partner", org_slug }` — one transaction: role `partner`, `organisation_user` row, `accepted_at` / `accepted_by`, `audit_log` `role.grant`. 401 guest; 403 `EMAIL_MISMATCH` (signed-in email ≠ invited email); 410 `INVITATION_INVALID` (expired or used); 409 `ALREADY_MEMBER_OF_PROJECT` (research Open question 3) |

A normal sign-up never sets `partner` (SYS BR-002, trigger unchanged). The invitation email and its link are sent only to test inboxes during tests.
