# Contract: sign-up, sign-in, password reset, my account

Feature: `003-sys-core` · Spec: FR-001..FR-005, BR-002..BR-005, US-1, US-2 · Screens: SC-04, SC-06, SC-07, SC-08 · Decisions: [research.md](../research.md) R5, R6, R12, R16

All routes are Next.js Route Handlers under `app/api/auth/` and `app/api/account/`; without Supabase configured they answer **503** `AUTH_UNAVAILABLE` (Supabase Auth is the only identity provider); passwords go straight to Supabase Auth and are never stored, logged or returned (BR-004). Error bodies: `{ "error": CODE, "message": text, "fields"?: {...} }`. Every user-visible message comes from the dictionary (FR-006).

## POST `/api/auth/sign-up` — FR-001, US-1 Scenario 1, 3

Request:

```json
{
  "full_name": "Jane Doe", "email": "jane@harbourline.example", "password": "at-least-10-chars",
  "org_name": "Harbour Line Films", "country": "GB", "crew_role": "producer",
  "website": "https://harbourline.example", "terms_accepted": true, "locale": "en"
}
```

- Validation (R16): `full_name` 1–120; email format, ≤ 254; password 10–72; `org_name` 1–200; `country` ISO 3166-1 alpha-2; `crew_role` ∈ producer / director / production_coordinator / line_producer / other; `website` optional ≤ 300; `terms_accepted` must be `true`.
- Calls `supabase.auth.signUp` with the fields (minus password) and the current `consent_version` as user metadata, and `emailRedirectTo = <site>/auth/callback?next=<next>`: the `next` of the request when it is a safe internal path (SC-04: back to the page that led here, SR-025), otherwise `/locations` (Open question 2).
- **201** `{ "status": "verification_sent" }` — the trigger created `user_account` (role `member`), `profile`, `producer_organisation`, `consent`.
- **409** `EMAIL_TAKEN` — *This email already has an account — Log in?* (empty `identities`, R5); no second account.
- **422** `VALIDATION_ERROR` with `fields`.
- A `role` in the body is ignored (BR-002).

## GET `/auth/callback` — US-1 Scenario 2, edge case *link expired*

Exchanges the code or verifies the token with Supabase Auth, starts the session, redirects to `next` (internal paths only). Expired or used link → `/login?error=link_expired` with *Link expired* and *Resend email*.

## POST `/api/auth/sign-in` — FR-002

`{ "email", "password", "next"? }` → **200** `{ "redirect": next or "/locations" }` with the session cookies; **401** `INVALID_CREDENTIALS` (same body whether the email exists or not); **403** `ACCOUNT_DEACTIVATED` (BR-005), only after the right password; **403** `EMAIL_NOT_VERIFIED` when Supabase answers `email_not_confirmed` (it does so only for the right password, so nothing is revealed; interim, research Open question 16). `next` must start with `/` and not `//` or `/\` (`lib/auth/next.js` `safeNext`); the query string is kept.

## POST `/api/auth/resend-verification` — edge case *email provider down*

`{ "email" }` → **200** always (no account enumeration); the screen locks *Resend* for 60 s (SR-214).

## POST `/api/auth/forgot-password` — FR-003, SC-06

`{ "email" }` → **200** `{ "status": "sent" }` always, same message whether or not the account exists (SR-211); deactivated accounts get no email (SR-213).

## POST `/api/auth/reset-password` — FR-003, SC-07

The email link opens `/reset-password?code=…`; `middleware.js` exchanges the code for a recovery session (cookies can only be written there) and reopens the page without it (a used or expired code → `?error=link_expired`, expired-link panel). With that session: `{ "new_password" }` (10–72) → **200** `{ "status": "ok" }` and every other session signed out (SR-224); expired or used link → **410** `LINK_EXPIRED`; deactivated account → **403** (SR-223).

## POST `/api/auth/sign-out`

Ends the session → **200**.

## GET `/api/account` — SC-08

Signed-in only → `{ email, email_verified, role, full_name, crew_role, locale, organisation: { org_name, country, website }, consents: [{ consent_version, accepted_at }] }`. Role is read-only (SR-232).

## PATCH `/api/account` — SC-08, FR-005

`{ full_name?, crew_role?, locale? }` → **200** updated account; other fields are refused with **422**. `locale` also sets the `locale` cookie.

## POST `/api/account/deactivate` — BR-005, SC-08 SR-233/234

`{ "confirm": "DELETE" }` exactly → **200**: account deactivated at once (`app_deactivate_my_account`), all sessions signed out; anything else → **422**.

## Session (server side)

`getSession()` (R6) → `{ isAuthenticated, role, userId, status }`. With Supabase configured, `x-mock-role` is ignored; on the sqlite source it counts only when `NODE_ENV=test`. A deactivated account is a guest. Pages that need sign-in redirect to `/login?next=<path and query>`.
