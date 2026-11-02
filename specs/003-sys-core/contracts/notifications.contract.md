# Contract: notifications and email (FR-007, FR-008, FR-009, US-4, SC-09)

Feature: `003-sys-core` · Decisions: D6, [research.md](../research.md) R11, Open questions 9 and 10 (event types)

## `notify({ recipientId, eventType, payload })` — server only, FR-007

- Inserts exactly one `notification` (`created_at = now()`, `read_at = null`) and one `email_delivery` (`queued`, `template_id = eventType`, `recipient_email` from `user_account`, `variables = payload`) per call (SR-243).
- Skips the email for a deactivated recipient. Returns `{ notification_id }`.
- Interim event types (Open question 10): `collab.response`, `province.reply`, `account.role_granted`; the seed also uses `collab_request.new|accepted|declined|withdrawn`, `province_notice.received|info_needed|bounced`, `verification.expiring`, `consultation.reminder` (research Open question 22). SC-09 has a label for each.

## Email sender — FR-008

`npm run send-emails` (and a server function for later scheduling) sends `queued` rows through `POST https://api.resend.com/emails` with `RESEND_API_KEY`, from `EMAIL_FROM`; success → `sent` + `provider_message_id`; provider rejection → `bounced`; network error → stays `queued`, attempt counted in `variables._attempts` (max 3, Open question 9). Without `RESEND_API_KEY` it sends nothing and reports how many are queued.

## GET `/api/notifications?unread_only=true|false` — FR-009, US-4 Scenario 2

Signed-in only → `{ "unread_count": 2, "has_more": false, "notifications": [{ notification_id, recipient_id, event_type, payload, created_at, read_at }] }`, newest first, 20 per page (`before=<created_at>` for older rows), the user's own only (RLS, SR-241).

## POST `/api/notifications/read` — FR-009

`{ "ids": [uuid] }` or `{ "all": true }` → sets `read_at = now()` on the user's own unread rows; **200** `{ "unread_count": n }`. Other columns cannot be changed (column grant).

## SC-09 (`/notifications`)

List newest first with an unread badge, *Mark all as read*, readable labels per event type from the dictionary; empty state; a notification about an archived project opens it read-only (SR-244, when that module exists).
