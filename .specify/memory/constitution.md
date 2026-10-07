<!--
Sync Impact Report:
- Version change: 1.0.0 → 1.0.0 (Adopted canonical course convention constitution for Session 8)
- Modified principles:
  - Principle I: "The specs are the source of truth (NON-NEGOTIABLE)" → "I. The spec is the source of truth" (aligned to course convention)
  - Principle II: "Scope discipline" → "II. Business rules are test-first (non-negotiable)" (redefined to course convention)
  - Principle III: "The law is cited, never decided by the software" → "III. Thin vertical slices" (redefined to course convention)
  - Principle IV: "Privacy and security by design (NON-NEGOTIABLE)" → "IV. Synthetic data and no secrets" (redefined to course convention)
  - Principle V: "Test-first, against the acceptance scenarios" → "V. Humans approve every change" (redefined to course convention)
- Added sections: None
- Removed sections:
  - "Technology constraints" (removed per instruction: technology choices belong in plan.md, not in the constitution)
  - "Development workflow and quality gates" (integrated into Core Principles and Governance)
- Follow-up TODOs: None (all placeholders resolved)
-->

# CINEMATCH Constitution

Project: CINEMATCH, team Team C, DBIZ3 VJCBI College - FTU. Client: Vietnam Film Development Association (VFDA).

CINEMATCH connects Vietnamese and foreign film-makers with locations, service partners and the licensing steps in Vietnam, under the Vietnam Film Development Association (VFDA). This constitution establishes the non-negotiable rules for all development, AI agents, and contributors across all Spec Kit steps (`/speckit-specify` … `/speckit-implement`). `AGENTS.md` holds the day-to-day working rules; when the two disagree, this constitution supersedes.

## Core Principles

### I. The spec is the source of truth

The spec is the source of truth. Requirements come only from `docs/spec/`. Data structures come only from `data/` (Session 5 data model, schema and seed). If code and spec disagree, the code is wrong until the spec is changed by a human in `docs/spec/`. Never invent a requirement; mark it `[NEEDS CLARIFICATION]` and stop.

### II. Business rules are test-first (non-negotiable)

Every business rule (BR-xxx) and every acceptance scenario of the slice being built gets an automated test that is written and seen failing before the code that makes it pass.

### III. Thin vertical slices

Build one user story at a time, end to end (screen, logic, data), in priority order P1, P2, P3. A slice is done only when its tests pass and it runs from a clean clone with the commands in `quickstart.md`.

### IV. Synthetic data and no secrets

Only the seed data generated in `data/` is used. No real personal data, no API keys or passwords in any committed file; secrets live in `.env`.

### V. Humans approve every change

The agent works on a branch, shows the changed files with a reason for each, and never pushes or merges. A teammate reviews every pull request before merge.

## Governance

Amend only by pull request reviewed by two members; bump the version (MAJOR when a principle is removed or redefined, MINOR when one is added, PATCH for wording). All pull requests and code reviews must verify compliance with Principles I–V. Complexity must be justified against the specifications.

Technology choices are NOT part of the constitution; they belong in `plan.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-01 | **Last Amended**: 2026-10-07
