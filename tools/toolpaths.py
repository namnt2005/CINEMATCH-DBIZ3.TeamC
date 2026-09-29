"""Find the external programs the generators need, on macOS, Windows or Linux.

Override any of them with an environment variable: CHROME_PATH, MMDC_PATH, PANDOC_PATH.
"""
import glob
import json
import os
import shutil
import tempfile

_CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    os.path.expanduser("~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
] + sorted(glob.glob("/opt/pw-browsers/chromium*/chrome-linux/chrome"), reverse=True)


def chrome():
    env = os.environ.get("CHROME_PATH")
    if env:
        return env
    for p in _CHROME_CANDIDATES:
        if os.path.exists(p):
            return p
    for name in ("google-chrome", "chromium", "chromium-browser", "chrome"):
        found = shutil.which(name)
        if found:
            return found
    return None


def mmdc():
    return os.environ.get("MMDC_PATH") or shutil.which("mmdc")


def pandoc():
    return os.environ.get("PANDOC_PATH") or shutil.which("pandoc") or "pandoc"


def puppeteer_config(directory=None):
    """Write the mermaid-cli browser config and return its path (None lets mmdc use its own browser)."""
    path = chrome()
    if not path:
        return None
    directory = directory or tempfile.mkdtemp()
    cfg = os.path.join(directory, "puppeteer.json")
    with open(cfg, "w") as fh:
        json.dump({"executablePath": path, "args": ["--no-sandbox"]}, fh)
    return cfg


def mmdc_cmd(src, out, directory=None, extra=()):
    """Command line to render one Mermaid file, or None if mermaid-cli is not installed."""
    exe = mmdc()
    if not exe:
        return None
    cmd = [exe]
    cfg = puppeteer_config(directory)
    if cfg:
        cmd += ["-p", cfg]
    return cmd + ["-i", src, "-o", out] + list(extra)
