# Quickstart Guide: Location Discovery (M3)

Feature: `001-m3-core`  
Spec: `specs/001-m3-core/spec.md`  
Data Source: `data/schema/schema-M3.sql` and `data/seed/`  
Target OS: macOS, Windows, Linux  
Date: 2026-10-12  

---

## 1. Prerequisites

Workstation requirements based on repository environment checker (`tools/check_env.py`):
- **Node.js**: Version 22 LTS or 24 LTS (`node --version` >= 22.0.0)
- **npm**: Installed with Node.js (`npm --version`)
- **Python**: Version 3.11+ (`python3 --version` or `py --version` on Windows)
- **Git**: Version 2.40+ (`git --version`)

---

## 2. Installation & Setup from a Fresh Clone

### On macOS / Linux

```bash
# 1. Switch to the feature branch
git switch 001-m3-core

# 2. Check repository environment readiness
python3 tools/check_env.py --repo

# 3. Choose the active feature on this laptop (.specify/feature.json is not in Git),
#    then verify the specification snapshot integrity
python3 tools/start_feature.py --use specs/001-m3-core
python3 tools/start_feature.py --check

# 4. Install dependencies
npm install

# 5. Verify database schema and seed package (via Python stdlib load check)
python3 data/schema/load_check.py
```

### On Windows (PowerShell)

```powershell
# 1. Switch to the feature branch
git switch 001-m3-core

# 2. Check repository environment readiness
py tools/check_env.py --repo

# 3. Choose the active feature on this laptop (.specify/feature.json is not in Git),
#    then verify the specification snapshot integrity
py tools/start_feature.py --use specs/001-m3-core
py tools/start_feature.py --check

# 4. Install dependencies
npm install

# 5. Verify database schema and seed package (via Python stdlib load check)
py data/schema/load_check.py
```

*Expected Verification Output:*
`load_check.py` finishes with:
```text
SQLite PASS — 9 schema files, 46 tables created; 46 seed files, 427 rows loaded in filename order; no foreign-key error
```

---

## 3. Running Automated Tests

Run the test suite on either platform:

```bash
npm test
```

> **Note on Testing Framework**: Selection of the specific test runner/framework for Next.js application code requires team confirmation before writing code tests.

---

## 4. Starting the Local Development Server

Start the local Next.js development server (runs with free tools on macOS and Windows):

```bash
npm run dev
```

The application will be accessible at:
- **URL**: [http://localhost:3000](http://localhost:3000)

---

## 5. End-to-End Verification Scenarios

### Scenario A: Scene Description AI Matching (US-1 / P1 — Primary Scope)
1. Open browser to `http://localhost:3000/locations/match` (`SC-15`).
2. Input the acceptance test prompt:
   > *"A ferry landing at dawn between limestone karsts, 1970s, a waterside village, about 30 extras, night scenes too"*
3. Click **Analyse description**:
   - Verify extracted attributes: `karst`, `river`, `floating_village`, `1970s`, `dawn`, `night`, `15_50`.
   - Verify mapped value note: `"waterside village" → mapped to "floating_village"` (F-M3-12).
4. Click **Find locations** (`SC-14`):
   - Verify results show only published locations scoring `>= 40` (e.g., Tràng An).
   - Verify each card shows score and at least one *why it matches* reason (BR-002).
   - Verify filter state is synchronized in URL query parameters.

### Scenario B: Gated Authority Contact (US-2 / P2 — Optional Scope)
1. Open browser to `http://localhost:3000/locations/trang-an-landscape-complex` (`SC-16`).
2. As a **Guest** (unauthenticated):
   - Verify public photos, logistics, season, and nearby locations within 30 km are displayed.
   - Verify the authority contact section displays a sign-up prompt; no phone or email is visible in page source.
3. As a **Member** (authenticated session or test toggle `x-mock-role: member`):
   - Verify local authority office name, verified contact person, phone number, and email address are visible.

*(Note: US-3 Admin Publishing, US-4 Compare/Shortlist, and US-5 Province Readiness are explicitly out of scope for this slice.)*
