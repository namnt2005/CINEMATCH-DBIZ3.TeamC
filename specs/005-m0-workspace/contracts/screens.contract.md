# Contract: screens SC-10, SC-12, SC-13

Feature: `005-m0-workspace` · Screen specs `docs/screens/screen-spec-SC-10.md`, `SC-12.md`, `SC-13.md` · Every text from `lib/i18n` (`projects.*`, `dashboard.*`, `settings.*`).

## SC-10 `/projects`
Title + *New project*; tabs Draft / Preparing / Archived with counts; cards (name, format, segment, readiness bar, shoot date or *not set*, one next step); *Invitations* block with *Accept* (D3); *Create new project* panel — name, format, segment (pre-filled from `?segment=`), optional shoot date, shoot days, crew size, provinces; *Create project* disabled until the three required fields are valid; Empty, Loading, Error (input kept), Success (to SC-12 with *Project … created*).

## SC-12 `/projects/[id]`
Header (name, segment, organisation; shoot date + days remaining or *Set date*); overall readiness (integer); one card per shown gauge: score or `—`, the next-step sentence (primary), the action button (live screen or *coming soon*); Logistics `—` *Phase 2*; Empty (all 0 %, *Start with a content pre-check*); Error (every gauge `—`, *Couldn't calculate readiness. Your project data is safe.*, *Try again*; never 0 %). Sidebar: Overview, Settings.

## SC-13 `/projects/[id]/settings`
Title + the viewer's role; details card (name, format read-only, shoot date after today, logline 500 with counter, stage) with *Save changes* for owner / edit, read-only for view and archived; members and invitations (name / email, Owner / Edit / View, Pending / Accepted; invite row for the owner only; *Only you are on this project…*); *Archive project…* with a confirmation that nothing is deleted (owner / edit), hidden when archived. No delete.
