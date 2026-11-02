# Contract: `lib/db/` with two sources

Feature: `003-sys-core` · Decisions: [research.md](../research.md) R6, R9 · D4

## Source selection

`lib/db/source.js` → `dataSource()` returns `'supabase'` when `process.env.NEXT_PUBLIC_SUPABASE_URL` is non-empty, otherwise `'sqlite'`. `npm test` runs with no Supabase variables, so tests always use `'sqlite'` and need no network.

## Public API (names unchanged, every function `async`)

| Module | Functions | Supabase implementation |
|---|---|---|
| `locations.js` | `getPublishedLocations`, `getLocationCounts`, `getLocationBySlug`, `getPublishedLocationBySlug`, `getLocationImages`, `getApprovedLocationImages`, `getAllLocationNames`, `getAllProvinces` | user client, RLS (published only for non-staff) |
| `search.js` | `searchLocations` (`removeDiacritics`, `resolveProvinceInput`, `buildSearchQueryFilter` stay pure) | reads published locations; text filter through `app_search_locations` (FR-010) |
| `location-detail.js` | `getLocationDetail` | user client |
| `nearby.js` | `getNearbyLocations` (`haversineKm` stays pure) | user client |
| `contacts.js` | `getAuthorityContact` (`canSeeAuthorityContact` stays pure) | user client; RLS returns nothing to guests (BR-001) |
| `queries.js` | `sanitizeAndLogQuery` | System (secret key), BR-009 |
| `admin-locations.js` | `listAdminLocations`, `countLocationsByStatus`, `getAdminLocation`, `createLocation`, `updateLocation`, `saveAuthorityContact`, `verifyAuthorityContact`, `publishLocation`, `unpublishLocation` | reads: user client; writes: RPC of data-model §5 (action + audit in one transaction) |
| `accounts.js` (new) | `getAccount(userId)`, `updateProfile(userId, fields)`, `deactivateMyAccount()`, `grantRole(userId, role)` | user client / RPC |
| `consent.js` (new) | `currentConsentVersion()`, `getConsents(userId)`, `acceptConsent(userId, version)` | user client |
| `notifications.js` (new) | `notify({ recipientId, eventType, payload })`, `listNotifications(userId, { unreadOnly })`, `unreadCount(userId)`, `markRead(userId, ids)` | `notify`: System; others: user client |

Errors keep the classes of `lib/admin/errors.js` (`AdminError`, `ValidationError`) in both sources, so Route Handlers do not change their mapping. Database messages of the [database contract](supabase-database.contract.md) map to the same codes (`UNVERIFIED_CONTACT`, `FORBIDDEN`, …).

## Clients

| File | Key | Where | Use |
|---|---|---|---|
| `lib/supabase/server.js` | publishable | server components, Route Handlers, middleware | user's session from cookies (`@supabase/ssr`) |
| `lib/supabase/browser.js` | publishable | client components | sign-in forms only |
| `lib/supabase/admin.js` | secret | server only; throws if `typeof window !== 'undefined'` | System actor |

`SUPABASE_SECRET_KEY` is read only in `lib/supabase/admin.js` and the scripts; a static test checks that no file under `app/` or any client component imports it and that no `NEXT_PUBLIC_` variable holds a secret.
