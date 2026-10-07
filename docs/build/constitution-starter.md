# Constitution starter (DBIZ3 Session 8)

Input for `/speckit-constitution`. Paste the block below as the command argument, replace every
`<...>`, and delete any principle your team rejects, with a one-line reason in the commit message.
These five principles are a course convention, not part of Spec Kit. Spec Kit only provides the
empty template in `.specify/memory/constitution.md`.

```text
Project: <product name>, team <team code>, DBIZ3 VJCBI College - FTU. Version 1.0.0.
Write the constitution with exactly these five principles and keep their wording:

I. The spec is the source of truth. Requirements come only from docs/spec/. Data structures
come only from data/ (Session 5 data model, schema and seed). If code and spec disagree, the
code is wrong until the spec is changed by a human in docs/spec/. Never invent a requirement;
mark it [NEEDS CLARIFICATION] and stop.

II. Business rules are test-first (non-negotiable). Every business rule (BR-xxx) and every
acceptance scenario of the slice being built gets an automated test that is written and seen
failing before the code that makes it pass.

III. Thin vertical slices. Build one user story at a time, end to end (screen, logic, data),
in priority order P1, P2, P3. A slice is done only when its tests pass and it runs from a clean
clone with the commands in quickstart.md.

IV. Synthetic data and no secrets. Only the seed data generated in data/ is used. No real
personal data, no API keys or passwords in any committed file; secrets live in .env.

V. Humans approve every change. The agent works on a branch, shows the changed files with a
reason for each, and never pushes or merges. A teammate reviews every pull request before merge.

Governance: amend only by pull request reviewed by two members; bump the version (MAJOR when a
principle is removed or redefined, MINOR when one is added, PATCH for wording).
Technology choices are NOT part of the constitution; they belong in plan.md.
```
