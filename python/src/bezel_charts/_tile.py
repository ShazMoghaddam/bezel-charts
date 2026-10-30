"""The bezel frame every chart sits in, ported from src/core/tile.js."""

from __future__ import annotations

from ._js import js_round, truthy
from ._util import MONO, SANS, N, clamp, esc, fmt, has, num, small, text, to_string

THEMES = {
    "dark": {
        "tile": "#15151d", "bezel": "#000000", "fg": "#f2f1f7", "muted": "#8c8aa0", "grid": "#2a2935",
        "up": "#5EE6C8", "down": "#F675A8",
        "palette": ["#9FA1FF", "#F675A8", "#5EE6C8", "#FFC857", "#7CC4FF", "#FF8A5B"],
    },
    "light": {
        "tile": "#ffffff", "bezel": "#000000", "fg": "#17161f", "muted": "#6b6980", "grid": "#e8e6ef",
        "up": "#12a383", "down": "#d63f7c",
        "palette": ["#6E70F0", "#E2508C", "#16A884", "#D99A0E", "#2F8FE0", "#EE6431"],
    },
}

CSS = (
    ".bzc-a{animation:bzc-in .6s ease both}"
    ".bzc-d{animation:bzc-draw 1.1s cubic-bezier(.3,.7,.2,1) both}"
    ".bzc-g{transform-box:fill-box;transform-origin:50% 100%;animation:bzc-grow .7s cubic-bezier(.2,.8,.2,1) both}"
    ".bzc-gn{transform-box:fill-box;transform-origin:50% 0;animation:bzc-grow .7s cubic-bezier(.2,.8,.2,1) both}"
    ".bzc-gx{transform-box:fill-box;transform-origin:0 50%;animation:bzc-growx .8s cubic-bezier(.2,.8,.2,1) both}"
    ".bzc-s{animation:bzc-sweep 1.1s cubic-bezier(.2,.8,.2,1) both}"
    "@keyframes bzc-in{from{opacity:0}}@keyframes bzc-draw{from{stroke-dashoffset:1}}"
    "@keyframes bzc-grow{from{transform:scaleY(0)}}@keyframes bzc-growx{from{transform:scaleX(0)}}"
    "@keyframes bzc-sweep{from{stroke-dasharray:0 100}}"
    "@media (prefers-reduced-motion:reduce){[class^=bzc-]{animation:none!important}}"
)


def dims(o):
    W = js_round(clamp(num(o.width, 360), 160, 2400))
    b = 0 if o.frame == "none" else 4
    P = 8 if o.frame == "none" else 20
    return {"W": W, "b": b, "P": P, "w": W - 2 * (b + P)}


def tile(o, th, h, draw, meta=None) -> str:
    d = dims(o)
    W, b, P, w = d["W"], d["b"], d["P"], d["w"]
    Rc = clamp(num(o.corners, 22), 0, 60)
    y = b + P
    head = ""
    if has(o.heading):
        head += text(b + P, y + 10, to_string(o.heading).upper(), small(th, 11, 'font-weight="600" letter-spacing="1.3"'))
        y += 24
    st = meta.get("stat") if meta else None
    if st:
        head += text(
            b + P, y + 30, fmt(st["val"], o),
            'fill="' + th["fg"] + '" font-family="' + SANS + '" font-size="32" font-weight="800" letter-spacing="-0.5"',
        )
        if st["delta"] is not None:
            delta = st["delta"]
            up, flat = delta > 0, delta == 0
            good = (not up) if o.delta == "inverse" else up
            col = th["muted"] if flat else th["up"] if good else th["down"]
            lbl = (
                ("● " if flat else "▲ " if up else "▼ ") + fmt(abs(delta), o) + " "
                + (to_string(o.deltaLabel) if has(o.deltaLabel) else "since start")
            )
            head += text(
                b + P + w, y + 28, lbl,
                'text-anchor="end" fill="' + col + '" font-family="' + MONO + '" font-size="11" font-weight="600"',
            )
        y += 44
    body = draw(b + P, y, w, h)
    H = js_round(y + h + P + b)
    bg = ""
    if o.frame != "none":
        bg = (
            '<rect width="' + N(W) + '" height="' + N(H) + '" rx="' + N(Rc) + '" fill="' + th["bezel"] + '"/>'
            + '<rect x="' + N(b) + '" y="' + N(b) + '" width="' + N(W - 2 * b) + '" height="' + N(H - 2 * b)
            + '" rx="' + N(max(0, Rc - b)) + '" fill="' + (to_string(o.background) if truthy(o.background) else th["tile"]) + '"/>'
        )
    elif has(o.background):
        bg = '<rect width="' + N(W) + '" height="' + N(H) + '" rx="' + N(Rc) + '" fill="' + to_string(o.background) + '"/>'
    label = (to_string(o.heading) + ": " if has(o.heading) else "") + ((meta and meta.get("summary")) or "chart")
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N(W) + " " + N(H) + '" width="' + N(W)
        + '" height="' + N(H) + '" role="img" aria-label="' + esc(label) + '"><title>' + esc(label) + "</title>"
        + ("<style>" + CSS + "</style>" if o.animate else "") + bg + head + body + "</svg>"
    )


__all__ = ["CSS", "THEMES", "dims", "tile"]
