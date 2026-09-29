"""Remove open questions from the published documents.

Open questions ([NEEDS CLARIFICATION: ...] markers and the "Open questions"
sections) are tracked outside this repository until they are answered.
build_docs.py and build_data.py call strip_file() on every file they write,
so a rebuild never brings the questions back.

Run on its own:  python3 tools/strip_questions.py   (from the repository root)
"""
import glob
import os
import re
import sys

NOTE = "_Open questions are tracked outside this repository until they are resolved._"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

MARK = r"\[NEEDS CLARIFICATION(?::[^\]]*)?\]"
SEE_OQ = (r"\s*(?:[—–;,]\s*)?\(?(?:see|See) (?:also )?(?:open questions?|OQ)[^.;)]*\)?"
          r"|\s*\((?:OQ-[\d-]+(?:,\s*)?)+\)"
          r"|\s*\((?:open questions?|OQ)[^)]*\)")


# Sentences and table cells that only point at a question.
FIXED = [
    (r"\|\s*Open questions?\s+\d+\s*(?=\|)", "| To be decided "),
    (r"\|\s*(?:OQ-[\d-]+[,; ]*)+(?=\|)", "| To be decided "),
    (r"\| Raised as \|", "| Status |"),
    (r"; weights \[NEEDS CLARIFICATION\]", "; weights to be set"),
    (r"after \[NEEDS CLARIFICATION: N\] working days", "after a set number of working days"),
    (r": \[NEEDS CLARIFICATION: expiry after N days\];", ": the request expires after a set number of days;"),
    (r"\s*\(open questions?\)", " (to be decided)"),
    (r"\s*[—–-]\s*shown as open question \d+", " — to be decided"),
    (r"\s*\|\s*see \d+ open questions and OQ-[\d-]+", ""),
    (r" and raised as OQ-[\d-]+", ""),
    (r"\s*[—–-]\s*open question\.", " — to be decided."),
    (r"M1 §10 asks whether it is segment A or B", "whether it is segment A or B is not decided yet"),
    (r"Clarify the blocking questions with VFDA \([^)]*\)", "Clarify the open points with VFDA (tracked outside this repository)"),
    (r"until their open questions are answered", "until the owning module decides which function writes them"),
    (r"point at open questions, not at thin data", "point at points still to be decided, not at thin data"),
]


def _is_oq_heading(line):
    return bool(re.match(r"#{2,4}\s+(?:\d+\.\s*)?(?:Consolidated\s+)?[Oo]pen questions\b", line))


def strip_text(text, mermaid_comments=True):
    out, skip_level = [], None
    for line in text.split("\n"):
        h = re.match(r"(#{1,6})\s", line)
        if skip_level is not None:
            if h and len(h.group(1)) <= skip_level:
                skip_level = None
            else:
                continue
        if _is_oq_heading(line):
            out += [line, "", NOTE, ""]
            skip_level = len(re.match(r"#+", line).group(0))
            continue
        # Mermaid / .mmd comment lines that only carry a question
        if mermaid_comments and re.match(r"\s*%%", line) and re.search(MARK, line):
            continue
        # checklist items or bullets that exist only to talk about open questions
        if re.match(r"\s*[-*] (\[[ xX]\] )?", line) and re.search(r"[Oo]pen questions?|NEEDS CLARIFICATION", line) \
                and not re.sub(MARK, "", line).strip(" -*[]xX.;:"):
            continue
        if re.match(r"\s*- \[[ xX]\] Open questions carry", line):
            out.append("- [x] Open questions are tracked outside this repository until they are resolved.")
            continue
        for a, b in FIXED:
            line = re.sub(a, b, line)
        # table cells that are only a marker -> em dash
        if line.lstrip().startswith("|"):
            cells = line.split("|")
            cells = [(" — " if re.fullmatch(r"\s*" + MARK + r"\s*", c) else c) for c in cells]
            line = "|".join(cells)
        before = line
        line = re.sub(r"\s*[—–-]\s*" + MARK, "", line)
        line = re.sub(r";\s*" + MARK, "", line)
        line = re.sub(r"\s*" + MARK, "", line)
        line = re.sub(SEE_OQ, "", line)
        if line != before:  # tidy punctuation only where something was removed
            line = re.sub(r"\s+([,;])", r"\1", line)
            line = re.sub(r"(\w)\s+\.(\s|$)", r"\1.\2", line)
            line = re.sub(r"[;,]\s*\.", ".", line)
        out.append(line)
    text = "\n".join(out)
    return re.sub(r"\n{4,}", "\n\n\n", text)


def strip_file(path):
    with open(path, encoding="utf-8") as fh:
        old = fh.read()
    new = strip_text(old)
    if new != old:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(new)
    return new != old


def targets(root=ROOT):
    pats = ["docs/spec/*.md", "docs/screens/*.md", "docs/*.md", "docs/architecture/*.md",
            "data/*.md", "data/*.mmd", "data/seed/README.md"]
    for p in pats:
        yield from sorted(glob.glob(os.path.join(root, p)))


if __name__ == "__main__":
    changed = [os.path.relpath(p, ROOT) for p in targets() if strip_file(p)]
    print(f"stripped open questions from {len(changed)} files")
    for c in changed:
        print("  " + c)
    sys.exit(0)
