#!/usr/bin/env python3
"""DBIZ3 Session 8: connect a module Spec Document to the Spec Kit build chain.

Spec Kit v1.0.1 looks for the active feature in `.specify/feature.json` and expects the
specification at `<feature directory>/spec.md`. In DBIZ3 the Spec Document lives in
`docs/spec/` (Session 4 and 6 layout). This script bridges the two without moving anything:

    uv run tools/start_feature.py ATT --name core
        Copies docs/spec/spec-ATT.md to specs/001-att-core/spec.md as a read-only snapshot,
        records the source file and its SHA-256 in the snapshot header, and makes
        specs/001-att-core the active feature in .specify/feature.json.

    uv run tools/start_feature.py --spec docs/spec/spec-document.md ATT --name core
        Same, for teams that keep every module in one Spec Document file.

    uv run tools/start_feature.py --check
        Exit 1 if the source Spec Document changed after the snapshot was taken.
        Run it before /speckit-plan, /speckit-tasks and /speckit-implement.

    uv run tools/start_feature.py --refresh
        Re-copy the source into the active feature after you changed docs/spec/.

    uv run tools/start_feature.py --use specs/002-ord-core
        Choose the active feature on this laptop. Needed after every fresh clone, because
        Spec Kit keeps .specify/feature.json out of Git, and when you switch to a teammate's feature.

Rule: docs/spec/ stays the single source of truth. Never edit specs/<feature>/spec.md by hand.
Standard library only; runs the same way on macOS and Windows.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HEADER_RE = re.compile(r"<!-- DBIZ3-SNAPSHOT source=(?P<src>\S+) sha256=(?P<sha>[0-9a-f]{64}) ")


def repo_root() -> Path:
    here = Path.cwd().resolve()
    for p in [here, *here.parents]:
        if (p / ".specify").is_dir():
            return p
    sys.exit("ERROR: no .specify/ folder found. Run this from inside the team repository "
             "after Spec Kit was initialised (Session 6, Part C5).")


def sha256(path: Path) -> str:
    # Normalise line endings so a Windows checkout and a macOS checkout give the same hash.
    data = path.read_bytes().replace(b"\r\n", b"\n")
    return hashlib.sha256(data).hexdigest()


def find_source(root: Path, module: str, explicit: str | None) -> Path:
    if explicit:
        p = (root / explicit).resolve()
        if not p.is_file():
            sys.exit(f"ERROR: {explicit} not found.")
        return p
    candidates = [root / "docs" / "spec" / f"spec-{module}.md",
                  root / "specs" / f"spec-{module}.md"]
    for c in candidates:
        if c.is_file():
            return c
    sys.exit(f"ERROR: no spec-{module}.md in docs/spec/ or specs/. "
             "If your team keeps one file for all modules, add --spec <path>.")


def next_number(specs_dir: Path) -> int:
    nums = [int(m.group(1)) for d in specs_dir.glob("*") if d.is_dir()
            and (m := re.match(r"(\d{3})-", d.name))]
    return max(nums, default=0) + 1


def write_snapshot(root: Path, source: Path, target: Path) -> None:
    rel = source.relative_to(root).as_posix()
    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    header = (f"<!-- DBIZ3-SNAPSHOT source={rel} sha256={sha256(source)} taken={stamp} -->\n"
              f"<!-- Read-only copy for Spec Kit. Do not edit here. Edit {rel}, then run:\n"
              f"     uv run tools/start_feature.py --refresh -->\n\n")
    body = source.read_text(encoding="utf-8")
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(header + body, encoding="utf-8", newline="\n")


def set_active(root: Path, feature_dir: Path) -> None:
    rel = feature_dir.relative_to(root).as_posix()
    (root / ".specify" / "feature.json").write_text(
        json.dumps({"feature_directory": rel}, indent=2) + "\n", encoding="utf-8", newline="\n")


def active_feature(root: Path) -> Path:
    fj = root / ".specify" / "feature.json"
    if not fj.is_file():
        folders = sorted(d.relative_to(root).as_posix() for d in (root / "specs").glob("[0-9][0-9][0-9]-*")
                         if (d / "spec.md").is_file())
        hint = (" Feature folders in this repository: " + ", ".join(folders) +
                ". On a fresh clone, choose one with: uv run tools/start_feature.py --use <folder>"
                if folders else " Run: uv run tools/start_feature.py <MODULE-ID> --name <slice>")
        sys.exit("ERROR: no active feature on this laptop (.specify/feature.json is not shared by Git)." + hint)
    return root / json.loads(fj.read_text(encoding="utf-8"))["feature_directory"]


def read_header(spec: Path) -> tuple[str, str]:
    m = HEADER_RE.search(spec.read_text(encoding="utf-8").split("\n", 1)[0])
    if not m:
        sys.exit(f"ERROR: {spec} has no DBIZ3-SNAPSHOT header. Was it edited by hand?")
    return m.group("src"), m.group("sha")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("module", nargs="?", help="Module ID, for example ATT")
    ap.add_argument("--name", default="core", help="short slice name, for example core")
    ap.add_argument("--spec", help="path of the source Spec Document, if not docs/spec/spec-<MODULE>.md")
    ap.add_argument("--check", action="store_true", help="fail if the source changed since the snapshot")
    ap.add_argument("--refresh", action="store_true", help="re-copy the source into the active feature")
    ap.add_argument("--use", help="make an existing specs/NNN-... folder the active feature")
    a = ap.parse_args()
    root = repo_root()

    if a.use:
        fd = (root / a.use).resolve()
        if not (fd / "spec.md").is_file():
            sys.exit(f"ERROR: {a.use}/spec.md not found.")
        set_active(root, fd)
        print(f"Active feature: {fd.relative_to(root).as_posix()}")
        return 0

    if a.check or a.refresh:
        fd = active_feature(root)
        src_rel, recorded = read_header(fd / "spec.md")
        src = root / src_rel
        if not src.is_file():
            sys.exit(f"ERROR: source {src_rel} no longer exists.")
        current = sha256(src)
        if a.refresh:
            write_snapshot(root, src, fd / "spec.md")
            print(f"Refreshed {fd.relative_to(root).as_posix()}/spec.md from {src_rel}.")
            print("Plan and tasks were written for the old spec: re-run /speckit-plan and "
                  "/speckit-tasks, or check them by hand, before implementing more.")
            return 0
        if current != recorded:
            print(f"DRIFT: {src_rel} changed after the snapshot in "
                  f"{fd.relative_to(root).as_posix()}/spec.md. Run --refresh, then review plan and tasks.")
            return 1
        print(f"OK: {fd.relative_to(root).as_posix()}/spec.md matches {src_rel}.")
        return 0

    if not a.module:
        ap.error("give a MODULE-ID, or use --check, --refresh or --use")
    module = a.module.upper()
    if not re.fullmatch(r"[A-Z0-9]{2,8}", module):
        sys.exit("ERROR: MODULE-ID must be 2 to 8 letters or digits, as in your Spec Document.")
    slug = re.sub(r"[^a-z0-9]+", "-", a.name.lower()).strip("-") or "core"
    source = find_source(root, module, a.spec)
    specs_dir = root / "specs"
    existing = [d for d in specs_dir.glob(f"*-{module.lower()}-{slug}") if d.is_dir()]
    if existing:
        sys.exit(f"ERROR: {existing[0].relative_to(root).as_posix()} already exists. "
                 f"Use --use {existing[0].relative_to(root).as_posix()} to make it active.")
    fd = specs_dir / f"{next_number(specs_dir):03d}-{module.lower()}-{slug}"
    write_snapshot(root, source, fd / "spec.md")
    set_active(root, fd)
    print(f"Created {fd.relative_to(root).as_posix()}/spec.md from {source.relative_to(root).as_posix()}")
    print(f"Active feature: {fd.relative_to(root).as_posix()} (.specify/feature.json)")
    print("Next: /speckit-plan in the agent chat (Workshop Guide, step 3).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
