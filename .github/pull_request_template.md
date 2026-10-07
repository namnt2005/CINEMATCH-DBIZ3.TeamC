## What this pull request does

Feature: `specs/<NNN-module-slice>`    Tasks: `T0xx` to `T0yy`    User story: `US-<n>`

## Checklist for the author

- [ ] Every changed file belongs to the tasks above. No unrelated reformatting or renaming.
- [ ] Tests for the business rules in this slice were written first and seen failing (build log entry `<n>`).
- [ ] `uv run tools/start_feature.py --check` prints OK.
- [ ] All tests pass locally. Last line: `<...>`
- [ ] No secret and no real personal data added.
- [ ] Spec gaps found while building are in `docs/spec/` as open questions, not hidden in code.

## Checklist for the reviewer (a member who did not write this)

- [ ] I ran the quickstart commands on my own laptop and the tests pass.
- [ ] I picked one business rule and found both its test and its code. Rule checked: `BR-<n>`.
- [ ] I read every changed file. Anything I do not understand is asked below, not approved.
