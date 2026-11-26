"""Notes on charts with an x-axis: a dashed marker at one point or a shaded span across several, each with a label
along the top. Ported from src/core/notes.js."""

from __future__ import annotations

from ._util import R, clamp, jmax, jmin, small, text, tw

ROW = 12
ROWS = 3


def note_layout(notes, n, at, px, pw) -> dict:
    """Where each note goes, and how many rows of labels they use, exactly as in JavaScript. at(i) gives point i's
    centre and the left and right edges it covers, as a dict with c, l and r."""
    items, rows = [], 0
    for nt in notes:
        if nt["i"] >= n:
            continue
        a = at(nt["i"])
        span = nt.get("j") is not None and nt["j"] != nt["i"]
        l, r = a["l"], a["r"]
        if span:
            b = at(min(nt["j"], n - 1))
            l, r = jmin(a["l"], b["l"]), jmax(a["r"], b["r"])
        half = tw(nt["text"], 10, True) / 2
        room = jmax(30, half)
        x = clamp((l + r) / 2 if span else a["c"], px + room, px + pw - room)
        row = 0
        while row < ROWS - 1 and any(
            p["row"] == row and x - half < p["x"] + p["half"] + 6 and p["x"] - p["half"] < x + half + 6 for p in items
        ):
            row += 1
        rows = max(rows, row + 1)
        items.append({"x": x, "half": half, "row": row, "text": nt["text"], "span": span, "c": a["c"], "l": l, "r": r})
    return {"items": items, "rows": rows, "height": rows * ROW if rows else 0}


def note_marks(th, lay, top, bottom) -> str:
    """Draws the notes laid out by note_layout: spans first, then markers and labels."""
    s = ""
    for p in lay["items"]:
        if p["span"]:
            y = top + 12 + p["row"] * ROW
            s += (
                '<rect x="' + R(p["l"]) + '" y="' + R(top) + '" width="' + R(jmax(1, p["r"] - p["l"])) + '" height="' + R(bottom - top)
                + '" fill="' + th["fg"] + '" fill-opacity=".07"/>'
                + '<path d="M' + R(p["l"]) + "," + R(y) + "V" + R(bottom) + "M" + R(p["r"]) + "," + R(y) + "V" + R(bottom)
                + '" stroke="' + th["fg"] + '" stroke-opacity=".18"/>'
            )
    for p in lay["items"]:
        y = top + 8 + p["row"] * ROW
        if not p["span"]:
            s += (
                '<line x1="' + R(p["c"]) + '" x2="' + R(p["c"]) + '" y1="' + R(y + 4) + '" y2="' + R(bottom) + '" stroke="'
                + th["fg"] + '" stroke-opacity=".4" stroke-dasharray="3 3"/>'
            )
        s += text(p["x"], y, p["text"], small(th, 10, 'text-anchor="middle"', th["fg"]))
    return s
