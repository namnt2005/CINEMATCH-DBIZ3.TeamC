# -*- coding: utf-8 -*-
"""Gate G3 check: the schema creates an empty database and the seed files load in filename order
with no foreign-key error.

    python3 data/schema/load_check.py                  # SQLite (Python standard library only)
    python3 data/schema/load_check.py --postgres DSN   # also PostgreSQL, e.g. "host=/tmp port=5433 user=postgres"

SQLite: runs data/schema/schema-*.sql in filename order, turns foreign keys ON, then loads
data/seed/NN_<table>.csv in filename order (empty cell = NULL) and finally runs PRAGMA foreign_key_check.
PostgreSQL checks foreign keys when a table is created, and the module files reference each other
(M0 PROJECT_PROVINCE -> M3 PROVINCE, M3 PROJECT_SHORTLIST -> M0 PROJECT), so the tables of all files are
created in load order (the NN of their seed file); the seed files then load in filename order with \\copy."""
import csv, glob, os, re, sqlite3, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SEED = os.path.join(HERE, "..", "seed")
SCHEMAS = sorted(glob.glob(os.path.join(HERE, "schema-*.sql")))
SEEDS = sorted(glob.glob(os.path.join(SEED, "[0-9][0-9]_*.csv")))
table_of = lambda path: re.sub(r"^\d+_", "", os.path.basename(path))[:-4]


def sqlite_check():
    db = sqlite3.connect(":memory:")
    for f in SCHEMAS:
        db.executescript(open(f, encoding="utf-8").read())
    n_tables = db.execute("SELECT count(*) FROM sqlite_master WHERE type = 'table'").fetchone()[0]
    db.execute("PRAGMA foreign_keys = ON")
    rows = 0
    for f in SEEDS:
        with open(f, encoding="utf-8") as fh:
            r = csv.reader(fh); head = next(r)
            sql = f"INSERT INTO {table_of(f)} ({', '.join(head)}) VALUES ({', '.join('?' * len(head))})"
            for line in r:
                try:
                    db.execute(sql, [v if v != "" else None for v in line]); rows += 1
                except sqlite3.Error as ex:
                    sys.exit(f"SQLite FAIL in {os.path.basename(f)}: {ex} — row {line[:3]}")
    bad = db.execute("PRAGMA foreign_key_check").fetchall()
    if bad: sys.exit(f"SQLite FAIL: foreign_key_check {bad[:5]}")
    print(f"SQLite PASS — {len(SCHEMAS)} schema files, {n_tables} tables created; {len(SEEDS)} seed files, {rows} rows loaded in filename order; no foreign-key error")


def postgres_check(dsn):
    stmts = []
    for f in SCHEMAS:
        for m in re.finditer(r"CREATE TABLE (\w+) \(.*?\n\);", open(f, encoding="utf-8").read(), re.S):
            stmts.append((m.group(1), m.group(0)))
    order = {table_of(f): i for i, f in enumerate(SEEDS)}
    stmts.sort(key=lambda s: order[s[0]])
    with tempfile.NamedTemporaryFile("w", suffix=".sql", delete=False, encoding="utf-8") as t:
        t.write("\\set ON_ERROR_STOP on\nDROP SCHEMA IF EXISTS cm_check CASCADE;\nCREATE SCHEMA cm_check;\nSET search_path = cm_check;\nBEGIN;\n")
        t.write("\n".join(s for _, s in stmts) + "\n")
        for f in SEEDS:
            t.write(f"\\copy {table_of(f)} FROM '{os.path.abspath(f)}' WITH (FORMAT csv, HEADER true)\n")
        t.write("COMMIT;\nSELECT count(*) AS tables FROM information_schema.tables WHERE table_schema = 'cm_check';\nDROP SCHEMA cm_check CASCADE;\n")
    r = subprocess.run(["psql", dsn, "-q", "-X", "-f", t.name], capture_output=True, text=True)
    os.unlink(t.name)
    if r.returncode: sys.exit("PostgreSQL FAIL: " + (r.stderr or r.stdout)[-800:])
    print(f"PostgreSQL PASS — {len(stmts)} tables created in load order; {len(SEEDS)} seed files loaded in filename order; no foreign-key or CHECK error")


if __name__ == "__main__":
    sqlite_check()
    if "--postgres" in sys.argv:
        postgres_check(sys.argv[sys.argv.index("--postgres") + 1])
