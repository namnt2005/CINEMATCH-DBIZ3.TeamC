"""Helper used once on 30/09/2026 to append items to the spec source lists (kept for reproducibility)."""
import ast

def _find(src, mod_id, key):
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "dict":
            kws = {k.arg: k.value for k in node.keywords}
            if isinstance(kws.get("id"), ast.Constant) and kws["id"].value == mod_id:
                return kws[key]
    raise KeyError((mod_id, key))

def _offset(src, line, col):
    lines = src.split("\n")
    return sum(len(l) + 1 for l in lines[:line - 1]) + col

def append(fn, mod_id, key, items_code):
    src = open(fn, encoding="utf-8").read()
    node = _find(src, mod_id, key)
    end = _offset(src, node.end_lineno, node.end_col_offset) - 1  # position of closing ]
    assert src[end] == "]"
    sep = ",\n     " if node.elts else ""
    src = src[:end] + sep + ",\n     ".join(items_code) + src[end:]
    open(fn, "w", encoding="utf-8").write(src)
