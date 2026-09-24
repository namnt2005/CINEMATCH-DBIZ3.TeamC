#!/usr/bin/env python3
"""DBIZ3 Session 6 environment checker.

Runs on macOS and Windows with the Python standard library only.

    uv run tools/check_env.py            # workstation check
    uv run tools/check_env.py --repo     # workstation + team repository check
    uv run tools/check_env.py --path A   # also require Claude Code (Path A)

Exit code 0 means no FAIL line. WARN lines do not block, but must be
explained in the Environment Readiness Report.
"""
from __future__ import annotations

import argparse
import platform
import re
import shutil
import subprocess
import sys
from pathlib import Path

PASS, WARN, FAIL = "PASS", "WARN", "FAIL"
rows: list[tuple[str, str, str]] = []


def run(cmd: list[str]) -> tuple[int, str]:
    """Run a command found on PATH; return (exit code, combined output)."""
    exe = shutil.which(cmd[0])
    if exe is None:
        return 127, ""
    try:
        p = subprocess.run([exe, *cmd[1:]], capture_output=True, text=True,
                           encoding="utf-8", errors="replace", timeout=60)
        return p.returncode, (p.stdout + p.stderr).strip()
    except (OSError, subprocess.TimeoutExpired) as exc:
        return 1, str(exc)


def first_version(text: str) -> tuple[int, ...] | None:
    labelled = re.search(r"CLI Version\s+(\d+)\.(\d+)(?:\.(\d+))?", text)
    if labelled:
        return tuple(int(g) for g in labelled.groups() if g is not None)
    m = re.search(r"(\d+)\.(\d+)(?:\.(\d+))?", text)
    return tuple(int(g) for g in m.groups() if g is not None) if m else None


def add(item: str, status: str, detail: str) -> None:
    rows.append((item, status, detail))


def check_tool(item: str, cmd: list[str], minimum: tuple[int, ...] | None,
               required: bool, hint: str) -> None:
    code, out = run(cmd)
    if code == 127:
        add(item, FAIL if required else WARN, f"not found on PATH. {hint}")
        return
    if code != 0:
        add(item, FAIL if required else WARN, f"command failed: {out[:80]}")
        return
    ver = first_version(out)
    shown = ".".join(map(str, ver)) if ver else (out.splitlines()[0][:60] if out else "ok")
    if minimum and ver and ver < minimum:
        need = ".".join(map(str, minimum))
        add(item, FAIL if required else WARN, f"{shown} (need {need} or later)")
    else:
        add(item, PASS, shown)


def workstation(path: str) -> None:
    add("Operating system", PASS, f"{platform.system()} {platform.release()} {platform.machine()}")
    py = sys.version_info
    add("Python (via uv)", PASS if py >= (3, 11) else FAIL,
        f"{py.major}.{py.minor}.{py.micro}" + ("" if py >= (3, 11) else " (need 3.11 or later)"))
    check_tool("Git", ["git", "--version"], (2, 40), True, "Install Git (Setup Guide, step 2).")
    code, name = run(["git", "config", "--global", "user.name"])
    code2, mail = run(["git", "config", "--global", "user.email"])
    add("Git identity", PASS if name and mail else FAIL,
        f"{name} <{mail}>" if name and mail else "run git config --global user.name / user.email")
    check_tool("GitHub CLI", ["gh", "--version"], (2, 0), True, "Install gh (Setup Guide, step 3).")
    code, out = run(["gh", "auth", "status"])
    if code == 127:
        pass  # already reported above
    else:
        add("GitHub login", PASS if code == 0 else FAIL,
            "logged in" if code == 0 else "run: gh auth login")
    check_tool("uv", ["uv", "--version"], (0, 5), True, "Install uv (Setup Guide, step 4).")
    check_tool("Node.js", ["node", "--version"], (22, 0), True, "Install Node.js 24 LTS (Setup Guide, step 5).")
    check_tool("Spec Kit (specify)", ["specify", "version"], (1, 0), True,
               "uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@v1.0.1")
    if path == "A" or shutil.which("claude"):
        check_tool("Claude Code", ["claude", "--version"], None, path == "A",
                   "Path A only. See Setup Guide, step 8.")


def repository() -> None:
    root = Path.cwd()
    code, top = run(["git", "rev-parse", "--show-toplevel"])
    if code != 0:
        add("Repository", FAIL, "run this from inside the team repository")
        return
    if Path(top).resolve() != root.resolve():
        add("Repository", WARN, f"run from the repository root: {top}")
        root = Path(top)
    expected = {
        "AGENTS.md": "agent contract (Setup Guide, part C)",
        ".agents/rules": "create the always-on rule in Antigravity (Setup Guide, C3)",
        ".specify": "run: specify init --here --force --integration agy",
        "docs/spec": "copy the Session 4 Spec Document here",
        "data": "copy the Session 5 data package here",
        ".gitignore": "copy from the starter kit",
        ".gitattributes": "copy from the starter kit (line endings)",
    }
    for rel, hint in expected.items():
        p = root / rel
        if p.is_dir():
            ok = any(f.name.lower() != "readme.md" for f in p.iterdir())
        else:
            ok = p.is_file()
        add(f"repo: {rel}", PASS if ok else FAIL, "present" if ok else hint)
    gi = root / ".gitignore"
    if gi.exists():
        text = gi.read_text(encoding="utf-8", errors="ignore")
        add("repo: .env ignored", PASS if re.search(r"^\.env", text, re.M) else FAIL,
            "secrets excluded" if re.search(r"^\.env", text, re.M) else "add .env to .gitignore")
    code, out = run(["git", "status", "--porcelain"])
    add("repo: clean tree", PASS if code == 0 and not out else WARN,
        "nothing uncommitted" if not out else f"{len(out.splitlines())} uncommitted change(s)")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--repo", action="store_true", help="also check the team repository")
    ap.add_argument("--path", choices=["A", "B", "C"], default="B",
                    help="access path; A requires Claude Code")
    args = ap.parse_args()
    workstation(args.path)
    if args.repo:
        repository()
    w = max(len(r[0]) for r in rows)
    print(f"\nDBIZ3 Session 6 environment check (path {args.path})\n")
    for item, status, detail in rows:
        print(f"  [{status}] {item.ljust(w)}  {detail}")
    fails = sum(1 for r in rows if r[1] == FAIL)
    warns = sum(1 for r in rows if r[1] == WARN)
    print(f"\n  {fails} FAIL, {warns} WARN. "
          + ("Ready." if fails == 0 else "Fix every FAIL before the smoke test."))
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
