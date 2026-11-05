# Contract: consultation requests API (FR-005 as reshaped by BR-005, Clarifications Q5)

Feature: `006-m7-support` · [research.md](../research.md) R8

| Route | Who | Body / query | Answer |
|---|---|---|---|
| `POST /api/consultations` | signed-in member (not deactivated, SR-365) | `{ topic, timezone, preferred_times: [ISO 8601 with offset, 1–3] }` | **201** `{ booking_id, email: 'sent' \| 'queued' \| 'failed' }`; 401 guest; 422 `VALIDATION_ERROR` with `fields` (topic not one of the 5, unknown IANA zone, 0 or > 3 times, a time in the past or > 180 days ahead, duplicates) |
| `GET /api/consultations` | signed-in member | | **200** `{ requests: [{ booking_id, topic, timezone, preferred_times, booking_status: null \| confirmed \| rescheduled }] }`, the member's own, by first preferred time (`slot_start`), upcoming first — the table has no creation time |

Email:
- one email per request, sent by the System actor through `resend`;
- `to: VFDA_CONSULT_EMAIL`, `from: EMAIL_FROM`, `reply_to: <member's account email>`;
- subject *Consultation request — <topic>*; the body lists each preferred time in the member's zone and in Asia/Ho_Chi_Minh, the member's name, organisation and time zone;
- recorded in `email_delivery` (`template_id = consultation.request`, `notification_id` empty): `queued` → `sent` (+ `provider_message_id`) or `bounced` (provider error);
- without `RESEND_API_KEY` or `VFDA_CONSULT_EMAIL` the row stays `queued` and the answer says `queued`;
- the booking is stored first, so an email failure never loses the request.

Not offered (BR-005): free slots, slot booking, officer assignment, confirmation, reminders (FR-006, FR-007).
