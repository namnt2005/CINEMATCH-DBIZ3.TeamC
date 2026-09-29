# -*- coding: utf-8 -*-
"""CINEMATCH mockup renderer: HTML/CSS -> PNG via Chromium (Playwright).
Every element with data-n="k" shows an orange numbered badge; the number is
row k of the Element inventory in the matching screen spec."""

CSS = r"""
*{box-sizing:border-box}
body{margin:0;background:#dfe2e6;font-family:"Liberation Sans","DejaVu Sans",Arial,sans-serif;color:#1c2026;font-size:14px;line-height:1.45}
.sheet{width:1328px;padding:18px 24px 26px}
.cap{display:flex;align-items:baseline;gap:14px;margin:0 2px 10px}
.cap .id{font:700 15px/1 "DejaVu Sans Mono",monospace;background:#1c2026;color:#fff;padding:5px 8px;border-radius:4px}
.cap .t{font-size:19px;font-weight:700}
.cap .m{margin-left:auto;font-size:12.5px;color:#4d545e}
.cap .lg{font-size:12px;color:#4d545e;display:flex;align-items:center;gap:6px}
.cap .lg i{display:inline-block;width:18px;height:18px;border-radius:9px;background:#e8590c;color:#fff;font:700 10.5px/18px Arial;text-align:center;font-style:normal}
.frame{background:#fff;border:1px solid #b9bec5;border-radius:10px;overflow:visible}
.chrome{height:36px;background:#eceef1;border-bottom:1px solid #d3d7dc;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:7px;padding:0 14px}
.chrome b{width:11px;height:11px;border-radius:6px;display:inline-block}
.url{margin-left:16px;flex:0 1 560px;background:#fff;border:1px solid #d3d7dc;border-radius:6px;height:23px;font:12px/21px "DejaVu Sans Mono",monospace;color:#5b626c;padding:0 10px;white-space:nowrap;overflow:hidden}
.nav{height:56px;display:flex;align-items:center;gap:30px;padding:0 28px;border-bottom:1px solid #e1e4e8}
.logo{font-weight:800;letter-spacing:.06em;color:#0d366b;font-size:17px}
.nav a{color:#3b424c;text-decoration:none;font-size:14px}
.nav a.on{color:#0d366b;font-weight:700;border-bottom:2px solid #0d366b;padding-bottom:17px;margin-bottom:-19px}
.nav .r{margin-left:auto;display:flex;gap:16px;align-items:center;font-size:13.5px;color:#3b424c}
.avatar{width:30px;height:30px;border-radius:15px;background:#cfd9e8;color:#0d366b;font-weight:700;font-size:12px;display:inline-flex;align-items:center;justify-content:center}
.body{display:flex;min-height:200px}
.side{width:212px;flex:none;border-right:1px solid #e1e4e8;padding:18px 12px;background:#fafbfc;border-radius:0 0 0 10px}
.side .pj{font-size:12px;color:#6b727c;padding:0 10px 4px;text-transform:uppercase;letter-spacing:.06em}
.side .pn{font-weight:700;padding:0 10px 14px;font-size:14.5px}
.side a{display:block;padding:7px 10px;border-radius:6px;color:#3b424c;text-decoration:none;font-size:13.5px}
.side a.on{background:#e3eaf5;color:#0d366b;font-weight:700}
.main{flex:1;padding:24px 30px 30px;min-width:0}
.page{padding:26px 34px 32px}
h1{font-size:24px;margin:0 0 4px;line-height:1.25}
h2{font-size:17px;margin:0 0 8px}
h3{font-size:14.5px;margin:0 0 6px}
.sub{color:#5b626c;font-size:13.5px}
.muted{color:#6b727c}
.small{font-size:12.5px}
.row{display:flex;gap:16px;align-items:flex-start}
.col{display:flex;flex-direction:column;gap:12px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:12px}
.card{border:1px solid #dce0e5;border-radius:8px;padding:14px 16px;background:#fff}
.card.soft{background:#f6f8fa}
.card.hl{border:2px solid #0d366b;padding:13px 15px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:36px;padding:0 16px;border-radius:6px;font-size:13.5px;font-weight:700;border:1px solid #0d366b;background:#0d366b;color:#fff;white-space:nowrap}
.btn.g{background:#fff;color:#0d366b}
.btn.q{background:#fff;color:#3b424c;border-color:#c5cad1;font-weight:400}
.btn.sm{height:28px;padding:0 10px;font-size:12.5px}
.btn.dis{background:#c5cad1;border-color:#c5cad1;color:#fff}
.lnk{color:#1f5fbf;font-size:13.5px}
.field{border:1px solid #c5cad1;border-radius:6px;background:#fff;min-height:36px;padding:8px 11px;font-size:13.5px;color:#1c2026}
.field.ph{color:#8a9099}
.lab{font-size:12.5px;font-weight:700;color:#3b424c;margin-bottom:5px}
.lab .opt{font-weight:400;color:#8a9099}
.hint{font-size:12px;color:#6b727c;margin-top:4px}
.chip{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 10px;border-radius:13px;border:1px solid #c5cad1;font-size:12.5px;background:#fff;color:#3b424c;white-space:nowrap}
.chip.on{background:#e3eaf5;border-color:#0d366b;color:#0d366b;font-weight:700}
.chip.dash{border-style:dashed;color:#6b727c}
.pill{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11.5px;font-weight:700;letter-spacing:.02em;white-space:nowrap}
.p-ok{background:#e3f1e7;color:#2f7d4a}
.p-warn{background:#fbf0dc;color:#9a5b00}
.p-bad{background:#f8e3e1;color:#a52a1f}
.p-info{background:#e3eaf5;color:#0d366b}
.p-mute{background:#eceef1;color:#5b626c}
.ver{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:11.5px;font-weight:700;background:#e3f1e7;color:#2f7d4a;border:1px solid #b9dcc4}
.ph{background:repeating-linear-gradient(135deg,#eef0f3 0 9px,#e5e8ec 9px 18px);border:1px solid #d5d9de;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#7c838d;font-size:12px;text-align:center}
.map{position:relative;background:#e6edf0;border:1px solid #cdd6db;border-radius:8px;background-image:linear-gradient(#d9e3e7 1px,transparent 1px),linear-gradient(90deg,#d9e3e7 1px,transparent 1px);background-size:36px 36px}
.pin{position:absolute;width:24px;height:24px;border-radius:12px 12px 12px 0;transform:rotate(-45deg);background:#0d366b;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)}
.pin span{display:block;transform:rotate(45deg);color:#fff;font:700 11px/20px Arial;text-align:center}
.bar{height:8px;background:#e6e9ed;border-radius:4px;overflow:hidden}
.bar i{display:block;height:100%;background:#0d366b}
.hr{height:1px;background:#e1e4e8;margin:14px 0}
table.t{border-collapse:collapse;width:100%;font-size:13px}
table.t th{text-align:left;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:#5b626c;background:#f3f5f7;padding:8px 10px;border-bottom:1px solid #dce0e5}
table.t td{padding:9px 10px;border-bottom:1px solid #e8ebee;vertical-align:top}
.ok{color:#2f7d4a;font-weight:700}.warn{color:#9a5b00;font-weight:700}.bad{color:#a52a1f;font-weight:700}
.banner{border-radius:8px;padding:11px 14px;font-size:13.5px}
.b-warn{background:#fbf0dc;border:1px solid #efd3a0;color:#6e4200}
.b-bad{background:#f8e3e1;border:1px solid #eab9b3;color:#7d1f16}
.b-info{background:#eef3fa;border:1px solid #c9d7ec;color:#0d366b}
.b-ok{background:#e3f1e7;border:1px solid #b9dcc4;color:#1f5a34}
.disc{border-top:1px solid #e1e4e8;margin-top:18px;padding-top:12px;font-size:12px;color:#6b727c}
.step{display:flex;align-items:center;gap:0}
.dot{width:26px;height:26px;border-radius:13px;border:2px solid #0d366b;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#0d366b;background:#fff;flex:none}
.dot.done{background:#0d366b;color:#fff}
.dot.off{border-color:#c5cad1;color:#8a9099}
.line{height:2px;background:#0d366b;flex:1}
.line.off{background:#d5d9de}
mark{background:#fde8a8;padding:1px 2px;border-radius:2px}
mark.r{background:#f6c9c3}
.foot{display:flex;gap:18px;padding:14px 34px;border-top:1px solid #e1e4e8;font-size:12.5px;color:#6b727c}
.tabs{display:flex;gap:0;border-bottom:1px solid #dce0e5}
.tabs span{padding:9px 16px;font-size:13.5px;color:#5b626c}
.tabs span.on{color:#0d366b;font-weight:700;border-bottom:2px solid #0d366b;margin-bottom:-1px}
.kbd{font:12px "DejaVu Sans Mono",monospace;background:#f3f5f7;border:1px solid #dce0e5;border-radius:4px;padding:1px 5px}
[data-n]{position:relative}
[data-n]::after{content:attr(data-n);position:absolute;top:-9px;left:-23px;min-width:19px;height:19px;padding:0 3px;border-radius:10px;background:#e8590c;color:#fff;font:700 10.5px/19px Arial,sans-serif;text-align:center;box-shadow:0 0 0 2px #fff;z-index:20;letter-spacing:0;text-transform:none;font-style:normal}
"""

NAV_ITEMS = ["Locations", "Partners", "Permits", "My projects"]


def nav(active=None, logged=True, n=1, lang_n=None, auth_n=None):
    links = "".join(
        f'<a class="{"on" if a == active else ""}">{a}</a>' for a in NAV_ITEMS)
    ln = f' data-n="{lang_n}"' if lang_n else ""
    an = f' data-n="{auth_n}"' if auth_n else ""
    right = (f'<span{ln}><b>EN</b> | VI</span><span class="row" style="gap:8px;align-items:center"{an}>'
             f'<span class="avatar">LP</span>Lena Park</span>') if logged else \
            (f'<span{ln}><b>EN</b> | VI</span><span{an}><a class="lnk">Log in</a> &nbsp;'
             f'<span class="btn sm">Sign up</span></span>')
    return f'<div class="nav" data-n="{n}"><span class="logo">CINEMATCH</span>{links}<span class="r">{right}</span></div>'


SIDE = [("Overview", "SC-12"), ("Content", "SC-48"), ("Article 13 dossier", "SC-27"),
        ("Locations", "SC-17"), ("Partners", "SC-25"), ("Document kit", "SC-26"),
        ("Bilingual drafts", "SC-28"), ("Countdown", "SC-29"), ("Provinces", "SC-32"),
        ("Settings", "SC-13")]


def side(active, n=None):
    a = "".join(f'<a class="{"on" if t == active else ""}">{t}</a>' for t, _ in SIDE)
    dn = f' data-n="{n}"' if n else ""
    return (f'<div class="side"{dn}><div class="pj">Project · Segment A</div>'
            f'<div class="pn">The Last Ferry</div>{a}</div>')


def page(sid, title, meta, route, content, active=None, logged=True, sidebar=None,
         side_n=None, nav_n=1, lang_n=None, auth_n=None, footer=""):
    head = (f'<div class="cap"><span class="id">{sid}</span><span class="t">{title}</span>'
            f'<span class="m">{meta}</span><span class="lg"><i>3</i> = row 3 of the Element inventory</span></div>')
    chrome = ('<div class="chrome"><b style="background:#ef8b7f"></b><b style="background:#f2c66b"></b>'
              f'<b style="background:#8fca8a"></b><div class="url">cinematch.vn{route}</div></div>')
    navhtml = nav(active, logged, nav_n, lang_n, auth_n) if nav_n is not None else ""
    if sidebar:
        inner = f'<div class="body">{side(sidebar, side_n)}<div class="main">{content}</div></div>'
    else:
        inner = f'<div class="page">{content}</div>'
    return (f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head>'
            f'<body><div class="sheet">{head}<div class="frame">{chrome}{navhtml}{inner}{footer}</div></div></body></html>')


def gauge(pct, label, size=112, off=False):
    """Mặt đồng hồ bán nguyệt bằng SVG."""
    import math
    r = 44
    cx, cy = 56, 56
    col = "#c5cad1" if off else "#0d366b"
    start = math.pi
    p = 0 if off else max(0.0, min(1.0, pct / 100))
    end = math.pi * (1 - p)
    x0, y0 = cx + r * math.cos(start), cy - r * math.sin(start)
    x1, y1 = cx + r * math.cos(end), cy - r * math.sin(end)
    track = f'<path d="M {cx-r} {cy} A {r} {r} 0 0 1 {cx+r} {cy}" fill="none" stroke="#e6e9ed" stroke-width="10" stroke-linecap="round"/>'
    arc = "" if p == 0 else f'<path d="M {x0:.1f} {y0:.1f} A {r} {r} 0 0 1 {x1:.1f} {y1:.1f}" fill="none" stroke="{col}" stroke-width="10" stroke-linecap="round"/>'
    txt = "—" if off else f"{pct}%"
    return (f'<svg width="{size}" height="{int(size*0.62)}" viewBox="0 0 112 68">{track}{arc}'
            f'<text x="56" y="56" text-anchor="middle" font-family="Liberation Sans,Arial" font-size="20" font-weight="700" fill="{"#8a9099" if off else "#1c2026"}">{txt}</text></svg>')


def render(items, outdir):
    """items: list of (sid, html). Chụp phần tử .sheet ra PNG."""
    import os
    from playwright.sync_api import sync_playwright
    os.makedirs(outdir, exist_ok=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1376, "height": 900}, device_scale_factor=1.5)
        for sid, html in items:
            pg.set_content(html, wait_until="load")
            pg.locator(".sheet").screenshot(path=f"{outdir}/{sid}.png")
            print("  ", sid)
        b.close()
