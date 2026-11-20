"""Writes the two Case 001 artboards for the design canvas from world.json: the close-up and the whole-building map.

    python boards.py    # -> ../omc-looks/project/Case001Close.dc.html, Case001Map.dc.html, and canvas.json updated
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(HERE, "..", "omc-looks", "project")
WORLD = json.load(open(os.path.join(HERE, "world.json")))
PLATE = "/_blob/cd1b32e64963fc8e3133ab9576af4d1f"
SPR = "/_blob/9ea35634ea41062688808ca47a3e2036"
XMIN, XMAX, ZMIN, ZMAX = WORLD["extent"]
WW, WH = XMAX - XMIN, ZMAX - ZMIN            # world size in cm = close-up CSS px (1 px per cm)
TOP = -78.0                                  # close-up: CSS y of the world's top edge
TILES = ["priya-shocked", "priya-idle", "squires-nervous", "squires-idle", "ozzy-idle", "ozzy-smug", "rena-smug", "rena-idle",
         "sam", "mei", "ali", "jo"]
DETECTIVES = {"sam", "mei", "ali", "jo"}
LOOP = 24.0


def cx(x):
    return x - XMIN


def cy(z):
    return ZMAX - z


def f(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


CS = 1.0      # character scale against the rooms (1.0 = the published boards)


def tile_size(name, k=1.0):
    h = (220.0 if name in DETECTIVES else 235.5) * k * CS
    return h * 0.714, h


def sprite(tile, x, z, k=1.0, cls="", style="", inner_cls="", delay=0.0):
    """A character standing with its feet at world (x, z), scaled by k CSS px per cm."""
    name = tile.split("-")[0]
    w, h = tile_size(name, k)
    left = (x - XMIN) * k - w / 2
    top = (ZMAX - z) * k - 0.926 * h
    pos = TILES.index(tile) / (len(TILES) - 1) * 100
    bob = f' class="bob {cls}" style="position: absolute; left: {f(left)}px; top: {f(top)}px; width: {f(w)}px; height: {f(h)}px; animation-delay: {delay}s{style}"'
    return (f'<div{bob}><div class="spr {inner_cls}" style="left: 0; top: 0; width: {f(w)}px; height: {f(h)}px; '
            f'background-position: {f(pos)}% 0"></div></div>')


def bubble(who, colour, line, left, top, tail, delay, width=172):
    return (f'<p class="say" style="position: absolute; left: {f(left)}px; top: {f(top)}px; margin: 0; max-width: {width}px; '
            f'font: 800 11px/1.25 \'Nunito\', sans-serif; color: #1b1f3b; background: #fff4e0; border: 2px solid {colour}; border-radius: 12px; '
            f'padding: 5px 8px; animation-delay: {delay}s"><b style="color: {colour}">{who}</b> {line}'
            f'<i class="tail" style="left: {f(tail)}px; border-color: {colour}"></i></p>')


def tag(label, x, z, k=1.0, size=11, extra=""):
    return (f'<span style="position: absolute; left: {f((x - XMIN) * k)}px; top: {f((ZMAX - z) * k)}px; font: italic 600 {size}px/1 \'Fraunces\', Georgia, serif; '
            f'color: #2a1a14; background: #fff4e0; border: 1px solid #2a1a14; border-radius: 4px; padding: 2px 6px; white-space: nowrap{extra}">{label}</span>')


HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,600;1,600&amp;family=Nunito:wght@700;800;900&amp;display=swap">
<style>
body{{margin:0}}
.spr{{position:absolute;background-image:url({spr});background-size:1200% 100%;background-repeat:no-repeat}}
.say{{position:absolute}}
.tail{{position:absolute;bottom:-7px;width:9px;height:9px;background:#fff4e0;border-style:solid;border-width:0 2px 2px 0;transform:rotate(45deg)}}
@keyframes bobD{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(-2px)}}}}
@keyframes flickD{{0%,38%,46%,100%{{opacity:.85}}40%{{opacity:.2}}43%{{opacity:.6}}}}
@keyframes blinkD{{0%,48%{{opacity:1}}50%,100%{{opacity:.15}}}}
@keyframes pulseD{{0%,100%{{opacity:.18}}50%{{opacity:.42}}}}
@keyframes ccD{{0%,100%{{opacity:.28}}20%{{opacity:.5}}45%{{opacity:.22}}70%{{opacity:.46}}}}
@keyframes haloD{{0%,100%{{opacity:.55;transform:scale(.96)}}50%{{opacity:1;transform:scale(1.06)}}}}
@keyframes dashD{{to{{stroke-dashoffset:-22}}}}
@keyframes rainD{{to{{background-position:-34px 120px}}}}
.bob{{animation:bobD 2.8s ease-in-out infinite}}
.flick{{animation:flickD 3.4s infinite}}
.blink{{animation:blinkD 1.3s steps(1) infinite}}
.pulse{{animation:pulseD 2.6s ease-in-out infinite}}
.cc{{animation:ccD 1.9s steps(1) infinite}}
.halo{{transform-box:fill-box;transform-origin:center;animation:haloD 1.8s ease-in-out infinite}}
.dash{{animation:dashD 1.2s linear infinite}}
.rain{{animation:rainD .6s linear infinite}}
{extra}
@media (prefers-reduced-motion: reduce){{.bob,.flick,.blink,.pulse,.cc,.halo,.dash,.rain,.cam,.mmv,.ghost,.gwalk,.ph,.say,.lbl{{animation:none!important}}}}
</style>
</helmet>
"""

FOOT = """</x-dc>
<script type="text/x-dc" data-dc-script data-props='{props}'>
class Component extends DCLogic {{
  renderVals() {{
    const ghosts = this.props.ghosts ?? true;
    return {{ ghosts: ghosts, live: !ghosts }};
  }}
}}
</script>
</body>
</html>
"""


def pct(t):
    return f"{t / LOOP * 100:.2f}%"


def hud(chip=None):
    avatars = "".join(
        f'<span style="width: 24px; height: 24px; margin-left: {"0" if i == 0 else "-7px"}; border-radius: 50%; background: {bg}; border: 2px solid #160e22; display: grid; place-items: center; font: 900 10px/1 \'Nunito\', sans-serif; color: {fg}">{ch}</span>'
        for i, (ch, bg, fg) in enumerate((("S", "#F2B33D", "#1b1f3b"), ("M", "#EF5B5B", "#fff4e0"), ("A", "#9B87F5", "#1b1f3b"), ("J", "#3FB8AF", "#1b1f3b"))))
    return f"""  <div style="position: absolute; left: 0; right: 0; top: 0; height: 128px; background: linear-gradient(rgba(12, 8, 22, 0.92), rgba(12, 8, 22, 0.62) 62%, rgba(12, 8, 22, 0)); pointer-events: none"></div>
  <div style="position: absolute; left: 16px; right: 16px; top: 14px; display: flex; justify-content: space-between; align-items: flex-start">
    <div>
      <p style="margin: 0; font: italic 600 24px/1.05 'Fraunces', Georgia, serif; color: #fff4e0">The Last Message</p>
      <p style="margin: 5px 0 0; font: 600 12px/1 'Fraunces', Georgia, serif; color: #f2b33d">Halden Innovation Building · 12:40 AM</p>
    </div>
    <div style="display: flex">{avatars}</div>
  </div>
  <p style="position: absolute; left: 16px; top: 64px; width: 222px; margin: 0; font: 800 11px/1.3 'Nunito', sans-serif; color: #fff4e0; background: rgba(22, 14, 34, 0.86); border: 1.5px solid #f2b33d; border-radius: 12px; padding: 6px 10px"><span style="color: #f2b33d">Chapter 1</span> · What proves Priya didn't take HALO home?</p>
{chip or ''}"""


# ---------------------------------------------------------------------------
# The close-up: the camera follows you room to room; the world is about 2.6 times the Dollhouse's size.

def close_up():
    feet = WORLD["feet"]
    cam = [(0, 87), (6, 87), (9, 470), (12, 620), (17, 620), (20, 87), (24, 87)]
    cam_kf = " ".join(f"{pct(t)}{{transform:translateX({-x}px)}}" for t, x in cam)
    mm = 112.0 / WW
    mm_kf = " ".join(f"{pct(t)}{{transform:translateX({f(x * mm)}px)}}" for t, x in cam)
    # ghost Priya: from her laptop, out of Lab 4, down the stairs, across the lobby, out of the door at 8:45
    base = (228.0, 306.0)
    route = [(0, 228, 306, 0), (3.0, 228, 306, 0), (3.6, 228, 306, 1), (4, 228, 306, 1), (6, 440, 306, 1), (6.6, 456, 306, 1), (7.8, 548, 156, 1), (9, 456, 6, 1),
             (11.5, 935, 6, 1), (12.5, 990, 6, 1), (12.8, 1000, 6, 0), (24, 228, 306, 0)]
    g_kf = " ".join(f"{pct(t)}{{translate:{f(x - base[0])}px {f(base[1] - z)}px;opacity:{o}}}" for t, x, z, o in route)
    ph = [(0, 39.8), (4, 39.8), (9, 55.7), (11.5, 59.7), (13, 59.7), (14.5, 358.0), (20.5, 358.0), (21.5, 39.8), (24, 39.8)]
    ph_kf = " ".join(f"{pct(t)}{{transform:translateX({f(x)}px)}}" for t, x in ph)

    def lbl(name, t0, t1):
        a, b = t0 / LOOP * 100, t1 / LOOP * 100
        return (f"@keyframes {name}{{0%,{max(0, a - 0.01):.2f}%{{opacity:0}}{a:.2f}%,{b:.2f}%{{opacity:1}}{min(100, b + 0.01):.2f}%,100%{{opacity:0}}}}"
                f".{name}{{animation:{name} {LOOP}s steps(1) infinite}}")

    extra = "\n".join([
        f"@keyframes camD{{{cam_kf}}}", f".cam{{animation:camD {LOOP}s ease-in-out infinite}}",
        f"@keyframes mmD{{{mm_kf}}}", f".mmv{{animation:mmD {LOOP}s ease-in-out infinite}}",
        f"@keyframes ghostD{{{g_kf}}}", f".ghost{{animation:ghostD {LOOP}s linear infinite}}",
        "@keyframes gwalkD{0%,100%{rotate:-3deg}50%{rotate:3deg}}", ".gwalk{transform-origin:50% 92%;animation:gwalkD .5s ease-in-out infinite}",
        f"@keyframes sayC{{0%{{opacity:0;transform:translateY(5px) scale(.94)}}1.6%{{opacity:1;transform:none}}11%{{opacity:1;transform:none}}12.5%,100%{{opacity:0;transform:translateY(-3px)}}}}",
        f".say{{animation:sayC {LOOP}s ease-in-out infinite both}}",
        f"@keyframes phD{{{ph_kf}}}", f".ph{{animation:phD {LOOP}s ease-in-out infinite}}",
        lbl("l840", 0, 5.5), lbl("l844", 5.5, 10.5), lbl("l845", 10.5, 14.2), lbl("llive", 14.2, 21.2), lbl("l840b", 21.2, 24),
        lbl("beep", 11.4, 13.4),
    ])

    def W2C(x, z):
        return cx(x), cy(z)

    # the desk's front, so Ozzy stands behind his counter
    desk = " ".join(f"{f(cx(x))}px {f(cy(z))}px," for x, z in WORLD["desk_front"]).rstrip(",")
    hx0, hz0, hx1, hz1 = WORLD["halo"]
    lx0, lz0, lx1, lz1 = WORLD["laptop_screen"]
    mx0, mz0, mx1, mz1 = WORLD["monitors"]
    parts = []
    a = parts.append
    a(HEAD.format(title="001 · Close-up", spr=SPR, extra=extra))
    a('<div style="width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; background: #160e22; color: #fff4e0; font-family: \'Nunito\', system-ui, sans-serif">')
    a(f'  <div class="cam" style="position: absolute; left: 0; top: {f(TOP)}px; width: {f(WW)}px; height: {f(WH)}px">')
    a(f'    <img src="{PLATE}" alt="The Halden Innovation Building at 12:40 AM, cut open: Lab 4 above the dark maker space, the corridor above the lobby and its stairs, and the car park and North Gate outside in the rain." style="position: absolute; left: 0; top: 0; width: {f(WW)}px; height: {f(WH)}px; display: block">')
    # lights and screens
    a(f'    <div class="pulse" aria-hidden="true" style="position: absolute; left: {f(cx(lx0))}px; top: {f(cy(lz1))}px; width: {f(lx1 - lx0)}px; height: {f(lz1 - lz0)}px; background: #7f9cff; mix-blend-mode: screen"></div>')
    a(f'    <div class="cc" aria-hidden="true" style="position: absolute; left: {f(cx(mx0))}px; top: {f(cy(mz1))}px; width: {f(mx1 - mx0)}px; height: {f(mz1 - mz0)}px; background: #cfe0ff; mix-blend-mode: screen"></div>')
    a(f'    <div class="flick" aria-hidden="true" style="position: absolute; left: {f(cx(320) - 70)}px; top: {f(cy(578))}px; width: 140px; height: 70px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 253, 242, 0.55), rgba(255, 253, 242, 0)); mix-blend-mode: screen"></div>')
    for i, x in enumerate((70 + 13, 118 + 13, 166 + 13)):
        a(f'    <i class="blink" aria-hidden="true" style="position: absolute; left: {f(cx(x) - 3)}px; top: {f(cy(83) - 3)}px; width: 6px; height: 6px; border-radius: 50%; background: #9fc6ff; box-shadow: 0 0 10px #7fb2ff; animation-delay: {i * 0.4}s"></i>')
    for (x, z, col, d) in ((321, 411, "#3dd68c", 0.2), (529, 434, "#3dd68c", 0.7), (945, 130, "#3dd68c", 0.4), (294, 62, "#ff6b6b", 0.9)):
        a(f'    <i class="blink" aria-hidden="true" style="position: absolute; left: {f(cx(x) - 2.5)}px; top: {f(cy(z) - 2.5)}px; width: 5px; height: 5px; border-radius: 50%; background: {col}; box-shadow: 0 0 8px {col}; animation-delay: {d}s"></i>')
    # room tags
    for label, x, z in (("Lab 4", 36, 556), ("Corridor", 700, 556), ("Maker space · closed", 36, 258), ("Lobby", 574, 258)):
        a("    " + tag(label, x, z))
    # people, back to front
    cast = [("mei", "mei", 0.2), ("priya-shocked", "priya", 0.9), ("jo", "jo", 1.4), ("sam", "sam", 0.5), ("rena-smug", "rena", 1.1),
            ("ozzy-idle", "ozzy", 1.7), ("ali", "ali", 0.3), ("squires-nervous", "squires", 1.0)]
    for tile, who, d in cast:
        x, z = feet[who]
        if who == "ozzy":
            z = 115 - 75 * CS
        a("    " + sprite(tile, x, z, delay=d))
        if who == "ozzy":
            a(f'    <div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: {f(WW)}px; height: {f(WH)}px; clip-path: polygon({desk}); pointer-events: none"><img src="{PLATE}" alt="" style="position: absolute; left: 0; top: 0; width: {f(WW)}px; height: {f(WH)}px"></div>')
    # the rewind layer
    gw, gh = tile_size("priya")
    a('    <sc-if value="{{ ghosts }}" hint-placeholder-val="{{ true }}">')
    a(f'      <div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: {f(WW)}px; height: {f(WH)}px; pointer-events: none">')
    a(f'        <svg viewBox="-30 -10 60 20" style="position: absolute; left: {f(cx(hx0) - 6)}px; top: {f(cy(hz1) - 4)}px; width: {f(hx1 - hx0 + 12)}px; height: {f(hz1 - hz0 + 8)}px; overflow: visible">'
      '<g class="halo"><circle cx="-12" cy="0" r="9" fill="rgba(127, 233, 221, 0.25)" stroke="#7fe9dd" stroke-width="2.4"/><circle cx="12" cy="0" r="9" fill="rgba(127, 233, 221, 0.25)" stroke="#7fe9dd" stroke-width="2.4"/>'
      '<path d="M-3 -1 Q0 -4 3 -1" fill="none" stroke="#7fe9dd" stroke-width="2.4"/><path d="M-21 -2 L-28 -5 M21 -2 L28 -5" stroke="#7fe9dd" stroke-width="2.4" stroke-linecap="round"/></g></svg>')
    card_l, card_t = cx(37), cy(582)
    a(f'        <svg viewBox="0 0 {f(WW)} {f(WH)}" style="position: absolute; left: 0; top: 0; width: {f(WW)}px; height: {f(WH)}px"><path class="dash" d="M{f(cx((hx0 + hx1) / 2))} {f(card_t + 62)} L{f(cx((hx0 + hx1) / 2))} {f(cy(hz1) - 3)}" fill="none" stroke="#ff7a7a" stroke-width="2.5" stroke-dasharray="5 5" stroke-linecap="round"/></svg>')
    a(f'        <div style="position: absolute; left: {f(card_l)}px; top: {f(card_t)}px; width: 172px; box-sizing: border-box; background: #fff4e0; border: 2px solid #c63f3f; border-radius: 10px; padding: 5px 8px 6px; color: #1b1f3b; box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35)">'
      '<p style="margin: 0; font: 900 9px/1.2 \'Nunito\', sans-serif; color: #c63f3f; letter-spacing: 0.04em">CAN\'T BOTH BE TRUE</p>'
      '<p style="margin: 3px 0 0; font: 900 11px/1.2 \'Nunito\', sans-serif; background: #f2b33d; border-radius: 6px; padding: 3px 6px">Priya, 8:40: “Taking HALO home”</p>'
      '<p style="margin: 3px 0 0; font: 900 10px/1.2 \'Nunito\', sans-serif; color: #1f7f78">HALO\'s dock: still charging till 9:13</p>'
      '<span style="position: absolute; right: -12px; top: -12px; transform: rotate(8deg); font: 900 9px/1 \'Nunito\', sans-serif; color: #d6312f; background: #fff4e0; border: 2px solid #d6312f; border-radius: 4px; padding: 3px 5px">EDITED 9:12</span></div>')
    a(f'        <div class="ghost" style="position: absolute; left: {f(cx(base[0]) - gw / 2)}px; top: {f(cy(base[1]) - 0.926 * gh)}px; width: {f(gw)}px; height: {f(gh)}px">'
      f'<div class="spr gwalk" style="left: 0; top: 0; width: {f(gw)}px; height: {f(gh)}px; background-position: {f(1 / 11 * 100)}% 0; opacity: 0.62; filter: grayscale(1) brightness(1.7) sepia(0.3) hue-rotate(160deg) drop-shadow(0 0 8px rgba(140, 225, 255, 0.9))"></div>'
      f'<span style="position: absolute; left: 50%; top: 18px; transform: translateX(-50%); font: 900 10px/1 \'Nunito\', sans-serif; color: #0d2633; background: #9fe3ff; border-radius: 999px; padding: 3px 8px; white-space: nowrap">Priya · 8:44 PM</span></div>')
    a(f'        <span class="beep" style="position: absolute; left: {f(cx(800))}px; top: {f(cy(175))}px; font: 900 11px/1.2 \'Nunito\', sans-serif; color: #0d2633; background: #9fe3ff; border: 2px solid #1b1f3b; border-radius: 10px; padding: 4px 8px; white-space: nowrap">8:45 · Priya badges out</span>')
    a('      </div>')
    a('    </sc-if>')
    # what people say, in turn (inside the world, so it pans with the camera)
    a(bubble("Priya", "#2f9f93", "I didn't write that. I swear I didn't!", cx(300) - 92, cy(306) - 150 - 55, 88, 0.5))
    a(bubble("Mei", "#d6312f", "Cabinet B. The key's still in the lock.", cx(165) - 82, cy(306) - 158 - 55, 78, 3.6))
    a(bubble("Ali", "#6a55d6", "Did anyone go into Lab 4 after Priya left?", cx(600) - 34, cy(6) - 158 - 55, 30, 10.0))
    a(bubble("Ozzy", "#3f6fd8", "Nobody. I walk that corridor every ten minutes.", cx(748) - 104, cy(40) - 150 - 55, 100, 13.0))
    a(bubble("Jo", "#1f7f78", "Chat log: that message was edited at 9:12.", cx(388) - 170, cy(306) - 158 - 55, 166, 20.2))
    a('  </div>')
    # HUD, minimap
    mmh = WH * mm
    vis0, vis1 = TOP, TOP + 844 - 132    # the world band the camera shows between the HUD and the panel
    chip = (f'  <div style="position: absolute; right: 16px; top: 46px; width: 112px; height: {f(mmh + 16)}px">'
            f'<span style="position: absolute; left: 0; top: 0; font: 900 9px/1 \'Nunito\', sans-serif; color: #cdb8d6; letter-spacing: 0.06em">MAP</span>'
            f'<div style="position: absolute; left: 0; top: 13px; width: 112px; height: {f(mmh)}px; border-radius: 6px; overflow: hidden; border: 1.5px solid rgba(255, 244, 224, 0.55); box-sizing: content-box">'
            f'<img src="{PLATE}" alt="" style="position: absolute; left: 0; top: 0; width: 112px; height: {f(mmh)}px">'
            f'<div class="mmv" style="position: absolute; left: 0; top: {f(-vis0 * mm)}px; width: {f(390 * mm)}px; height: {f(712 * mm)}px; box-sizing: border-box; border: 2px solid #f2b33d; border-radius: 3px; box-shadow: 0 0 0 999px rgba(10, 6, 20, 0.35)"></div></div></div>')
    a(hud(chip))
    # the rewind panel
    a('  <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 132px; box-sizing: border-box; background: #1f1229; border-top: 1.5px solid #3a2340; padding: 12px 16px 12px">')
    a('    <div style="display: flex; justify-content: space-between; align-items: center"><p style="margin: 0; font: italic 600 17px/1 \'Fraunces\', Georgia, serif; color: #fff4e0">Rewind the night</p>'
      '<span style="font: 900 11px/1 \'Nunito\', sans-serif; background: #f2b33d; color: #1b1f3b; border-radius: 999px; padding: 5px 10px">You · Archivist</span></div>')
    a('    <div style="position: relative; height: 46px; margin-top: 8px">')
    a('      <div style="position: absolute; left: 0; right: 0; top: 28px; height: 8px; border-radius: 9px; background: #3a2340"></div>')
    for t, col, title in ((40, "#ef5b5b", "8:40 the message"), (45, "#3fb8af", "8:45 Priya badges out"), (72, "#ef5b5b", "9:12 edited"), (77, "#f2b33d", "9:13 HALO leaves its dock"), (87, "#9b87f5", "9:17 Ozzy finds the cabinet open")):
        a(f'      <span title="{title}" style="position: absolute; left: {f(t / 90 * 358 - 5)}px; top: 14px; width: 10px; height: 10px; border-radius: 3px; background: {col}; border: 2px solid #1b1f3b; box-sizing: border-box"></span>')
    a('      <sc-if value="{{ ghosts }}" hint-placeholder-val="{{ true }}">')
    a('        <div class="ph" style="position: absolute; left: -15px; top: 0; width: 30px; height: 46px">')
    for cls, text, bg in (("l840", "8:40", "#ef5b5b"), ("l844", "8:44", "#3fb8af"), ("l845", "8:45", "#3fb8af"), ("llive", "LIVE", "#f2b33d"), ("l840b", "8:40", "#ef5b5b")):
        a(f'          <span class="{cls} lbl" style="position: absolute; left: 50%; top: 0; transform: translateX(-50%); font: 900 10px/1 \'Nunito\', sans-serif; background: {bg}; color: #1b1f3b; border-radius: 6px; padding: 3px 5px; white-space: nowrap">{text}</span>')
    a('          <span style="position: absolute; left: 4px; top: 22px; width: 22px; height: 22px; border-radius: 50%; background: #f2b33d; border: 3px solid #1b1f3b; box-sizing: border-box"></span></div>')
    a('      </sc-if>')
    a('      <sc-if value="{{ live }}" hint-placeholder-val="{{ false }}">')
    a('        <div style="position: absolute; left: 343px; top: 0; width: 30px; height: 46px"><span style="position: absolute; left: 50%; top: 0; transform: translateX(-50%); font: 900 10px/1 \'Nunito\', sans-serif; background: #f2b33d; color: #1b1f3b; border-radius: 6px; padding: 3px 5px">LIVE</span>'
      '<span style="position: absolute; left: 4px; top: 22px; width: 22px; height: 22px; border-radius: 50%; background: #f2b33d; border: 3px solid #1b1f3b; box-sizing: border-box"></span></div>')
    a('      </sc-if>')
    a('    </div>')
    a('    <div style="display: flex; justify-content: space-between; margin-top: 2px; font: 800 10px/1 \'Nunito\', sans-serif; color: #cdb8d6"><span>8:30 PM</span><span>9:00</span><span>9:30</span><span>10:00</span></div>')
    a('    <p style="margin: 8px 0 0; font: 700 11px/1.3 \'Nunito\', sans-serif; color: #cdb8d6">Swipe to walk the building · drag the night and ghosts walk where the evidence puts them</p>')
    a('  </div>')
    a('</div>')
    a(FOOT.format(props='{"ghosts":{"editor":"boolean","default":true},"$preview":{"width":390,"height":844}}'))
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# The whole building: pinch out, or tap the map, and the world shrinks to one strip with the night under it.

def whole_map():
    feet = WORLD["feet"]
    K = 358.0 / WW
    SX, SY = 16.0, 206.0
    strip_h = WH * K

    def mx(x):
        return SX + (x - XMIN) * K

    def my(z):
        return SY + (ZMAX - z) * K

    parts = []
    a = parts.append
    a(HEAD.format(title="001 · Whole building", spr=SPR, extra=".rainm{animation:rainD .6s linear infinite}"))
    a('<div style="width: 390px; height: 844px; box-sizing: border-box; position: relative; overflow: hidden; background: #160e22; color: #fff4e0; font-family: \'Nunito\', system-ui, sans-serif">')
    a(f'  <img src="{PLATE}" alt="" style="position: absolute; left: -620px; top: {f(TOP)}px; width: {f(WW)}px; height: {f(WH)}px; filter: brightness(0.38) blur(1.5px)">')
    a(hud())
    a('  <div style="position: absolute; left: 0; right: 0; top: 150px; bottom: 0; background: #1f1229; border-top-left-radius: 22px; border-top-right-radius: 22px; border-top: 1.5px solid #3a2340; box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.45)"></div>')
    a('  <span style="position: absolute; left: 175px; top: 159px; width: 40px; height: 4px; border-radius: 4px; background: #4a3250"></span>')
    a('  <p style="position: absolute; left: 16px; top: 172px; margin: 0; font: italic 600 19px/1 \'Fraunces\', Georgia, serif; color: #fff4e0">The whole building</p>')
    a('  <p style="position: absolute; right: 16px; top: 177px; margin: 0; font: 800 11px/1 \'Nunito\', sans-serif; color: #cdb8d6">Tap a room to go there</p>')
    # the strip
    a(f'  <div style="position: absolute; left: {f(SX)}px; top: {f(SY)}px; width: 358px; height: {f(strip_h)}px; border-radius: 12px; overflow: hidden; box-shadow: 0 0 0 1.5px #3a2340">')
    a(f'    <img src="{PLATE}" alt="Halden Innovation Building, small: Lab 4 and the maker space on the left, the corridor and the lobby in the middle, the car park and the North Gate on the right." style="position: absolute; left: 0; top: 0; width: 358px; height: {f(strip_h)}px; display: block">')
    a(f'    <div class="rainm" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 358px; height: {f(strip_h)}px; opacity: 0.3; clip-path: polygon(0 0, 358px 0, 358px {f(strip_h)}px, 0 {f(strip_h)}px, 0 {f(my(-6) - SY)}px, {f(mx(-20) - SX)}px {f(my(-6) - SY)}px, {f(mx(980) - SX)}px {f(my(-6) - SY)}px, {f(mx(980) - SX)}px {f(my(650) - SY)}px, {f(mx(-20) - SX)}px {f(my(650) - SY)}px, {f(mx(-20) - SX)}px {f(my(-6) - SY)}px, 0 {f(my(-6) - SY)}px); background-image: repeating-linear-gradient(105deg, rgba(200, 210, 255, 0) 0px, rgba(200, 210, 255, 0) 14px, rgba(200, 210, 255, 0.55) 14px, rgba(200, 210, 255, 0.55) 15px, rgba(200, 210, 255, 0) 15px, rgba(200, 210, 255, 0) 26px); background-size: 120px 120px"></div>')
    a('  </div>')
    # where everyone is now
    for tile, who in (("mei", "mei"), ("priya-shocked", "priya"), ("jo", "jo"), ("sam", "sam"), ("rena-smug", "rena"), ("ozzy-idle", "ozzy"), ("ali", "ali"), ("squires-nervous", "squires")):
        x, z = feet[who]
        w, h = tile_size(tile.split("-")[0], K)
        left = mx(x) - w / 2
        top = my(z) - 0.926 * h
        pos = TILES.index(tile) / (len(TILES) - 1) * 100
        a(f'  <div class="bob" style="position: absolute; left: {f(left)}px; top: {f(top)}px; width: {f(w)}px; height: {f(h)}px"><div class="spr" style="left: 0; top: 0; width: {f(w)}px; height: {f(h)}px; background-position: {f(pos)}% 0"></div></div>')
    # names for the suspects
    for name, who, dy in (("Priya", "priya", 0), ("Rena", "rena", 0), ("Ozzy", "ozzy", -8), ("Squires", "squires", 0)):
        x, z = feet[who]
        a(f'  <span style="position: absolute; left: {f(mx(x))}px; top: {f(my(z) + 2 + dy)}px; transform: translateX(-50%); font: 900 8px/1 \'Nunito\', sans-serif; color: #1b1f3b; background: #fff4e0; border-radius: 4px; padding: 1px 3px">{name}</span>')
    # rooms
    for label, x, z in (("Lab 4", 18, 574), ("Corridor", 590, 574), ("Maker space", 18, 274), ("Lobby", 830, 274), ("Car park", 1010, 230), ("North Gate", 1340, 330)):
        a(f'  <span style="position: absolute; left: {f(mx(x))}px; top: {f(my(z))}px; font: italic 600 9px/1 \'Fraunces\', Georgia, serif; color: #2a1a14; background: #fff4e0; border: 1px solid #2a1a14; border-radius: 3px; padding: 1px 4px; white-space: nowrap">{label}</span>')
    # your camera
    v0, v1 = 620 + XMIN, 1010 + XMIN
    a(f'  <div style="position: absolute; left: {f(mx(v0))}px; top: {f(my(606))}px; width: {f(390 * K)}px; height: {f(616 * K)}px; box-sizing: border-box; border: 2px solid #f2b33d; border-radius: 6px"></div>')
    a(f'  <span style="position: absolute; left: {f(mx(v0) + 2)}px; top: {f(my(606) - 15)}px; font: 900 9px/1 \'Nunito\', sans-serif; background: #f2b33d; color: #1b1f3b; border-radius: 5px; padding: 2px 5px">You are here</span>')
    a(f'  <p style="position: absolute; left: 16px; right: 16px; top: {f(SY + strip_h + 8)}px; margin: 0; font: 800 10px/1.3 \'Nunito\', sans-serif; color: #cdb8d6">Off the map, through the North Gate: <span style="color: #fff4e0">Gone home</span> · <span style="color: #fff4e0">Kestrel HQ, across town</span></p>')
    # the night, as the Archivist's map draws it
    T0 = 92.0
    span = 374.0 - T0
    def tx(minute):   # minutes after 8:30
        return T0 + minute / 90.0 * span
    top = SY + strip_h + 40
    a(f'  <p style="position: absolute; left: 16px; top: {f(top)}px; margin: 0; font: italic 600 15px/1 \'Fraunces\', Georgia, serif; color: #fff4e0">The night so far</p>')
    a(f'  <p style="position: absolute; right: 16px; top: {f(top + 2)}px; margin: 0; font: 800 10px/1 \'Nunito\', sans-serif; color: #cdb8d6">8:30 – 10:00 PM</p>')
    axis = top + 26
    for m, lab in ((0, "8:30"), (30, "9:00"), (60, "9:30"), (90, "10:00")):
        a(f'  <span style="position: absolute; left: {f(tx(m))}px; top: {f(axis)}px; transform: translateX(-50%); font: 800 9px/1 \'Nunito\', sans-serif; color: #8e7a98">{lab}</span>')
        a(f'  <span style="position: absolute; left: {f(tx(m))}px; top: {f(axis + 12)}px; width: 1px; height: 150px; background: #3a2340"></span>')
    ROOMC = {"lab4": "#6E7FB8", "lobby": "#F2B33D", "corridor": "#3FB8AF", "outside": "#6DBE7A", "home": "#8E8A9A"}

    def bar(m0, m1, y, room, word=False, h=12):
        col = ROOMC[room]
        bg = (f"repeating-linear-gradient(135deg, {col} 0 4px, rgba(0,0,0,0) 4px 8px)" if word else col)
        brd = f"border: 1.5px solid {col}; box-sizing: border-box;" if word else ""
        return (f'  <span style="position: absolute; left: {f(tx(m0))}px; top: {f(y)}px; width: {f(max(4.0, tx(m1) - tx(m0)))}px; height: {h}px; border-radius: 4px; background: {bg}; {brd}"></span>')

    rows = axis + 18
    a(f'  <span style="position: absolute; left: 16px; top: {f(rows + 1)}px; font: 900 11px/1 \'Nunito\', sans-serif; color: #fff4e0">Priya</span>')
    a(bar(0, 14, rows, "lab4", word=True))
    a(bar(15, 16, rows, "lobby"))
    a(bar(16, 90, rows, "home", word=True))
    r2 = rows + 40
    a(f'  <span style="position: absolute; left: 16px; top: {f(r2 + 6)}px; font: 900 11px/1 \'Nunito\', sans-serif; color: #7fe9dd">HALO</span>')
    a(bar(8, 43, r2, "lab4", h=10))
    a(bar(10, 90, r2 + 14, "home", word=True, h=10))
    a(f'  <span style="position: absolute; left: {f(tx(10))}px; top: {f(r2 - 4)}px; width: {f(tx(43) - tx(10))}px; height: 32px; box-sizing: border-box; border: 2px solid #ff7a7a; border-radius: 6px"></span>')
    a(f'  <span style="position: absolute; left: {f(tx(10))}px; top: {f(r2 - 22)}px; font: 900 9px/1 \'Nunito\', sans-serif; color: #fff4e0; background: #c63f3f; border-radius: 6px; padding: 3px 6px; white-space: nowrap">In two places at once</span>')
    r3 = r2 + 46
    for i, name in enumerate(("Squires", "Rena", "Ozzy")):
        y = r3 + i * 24
        a(f'  <span style="position: absolute; left: 16px; top: {f(y + 1)}px; font: 900 11px/1 \'Nunito\', sans-serif; color: #8e7a98">{name}</span>')
        a(f'  <span style="position: absolute; left: {f(T0)}px; top: {f(y)}px; width: {f(span)}px; height: 12px; border-radius: 4px; border: 1.5px dashed #4a3250; box-sizing: border-box"></span>')
        a(f'  <span style="position: absolute; left: {f(T0 + span / 2)}px; top: {f(y + 1)}px; transform: translateX(-50%); font: 800 9px/1 \'Nunito\', sans-serif; color: #8e7a98; background: #1f1229; padding: 0 5px">find evidence to fill this in</span>')
    leg = r3 + 3 * 24 + 6
    a(f'  <div style="position: absolute; left: 16px; right: 16px; top: {f(leg)}px; display: flex; flex-wrap: wrap; gap: 6px 12px; font: 800 9.5px/1 \'Nunito\', sans-serif; color: #cdb8d6">'
      '<span><i style="display: inline-block; width: 16px; height: 9px; border-radius: 3px; background: #6E7FB8; vertical-align: -1px"></i> proof: logs, photos</span>'
      '<span><i style="display: inline-block; width: 16px; height: 9px; border-radius: 3px; border: 1.5px solid #6E7FB8; box-sizing: border-box; background: repeating-linear-gradient(135deg, #6E7FB8 0 4px, rgba(0,0,0,0) 4px 8px); vertical-align: -1px"></i> someone\'s word</span>'
      '<span><i style="display: inline-block; width: 9px; height: 9px; border-radius: 2px; background: #6E7FB8; vertical-align: -1px"></i> Lab 4</span>'
      '<span><i style="display: inline-block; width: 9px; height: 9px; border-radius: 2px; background: #F2B33D; vertical-align: -1px"></i> Lobby</span>'
      '<span><i style="display: inline-block; width: 9px; height: 9px; border-radius: 2px; background: #8E8A9A; vertical-align: -1px"></i> Home</span></div>')
    a('  <span style="position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); font: 900 12px/1 \'Nunito\', sans-serif; color: #1b1f3b; background: #f2b33d; border-radius: 999px; padding: 9px 16px; white-space: nowrap">Back to the close-up</span>')
    a('</div>')
    a(FOOT.format(props='{"ghosts":{"editor":"boolean","default":true},"$preview":{"width":390,"height":844}}'))
    return "\n".join(parts)


if __name__ == "__main__":
    open(os.path.join(PROJ, "Case001Close.dc.html"), "w", encoding="utf-8").write(close_up())
    open(os.path.join(PROJ, "Case001Map.dc.html"), "w", encoding="utf-8").write(whole_map())
    canvas = json.load(open(os.path.join(PROJ, "canvas.json"), encoding="utf-8"))
    canvas["boards"]["Case001Close.dc.html"] = {"x": 0, "y": 1300, "w": 390, "h": 844, "title": "001 · Close-up"}
    canvas["boards"]["Case001Map.dc.html"] = {"x": 470, "y": 1300, "w": 390, "h": 844, "title": "001 · Whole building"}
    for k in ("Case001Close.dc.html", "Case001Map.dc.html"):
        if k not in canvas["order"]:
            canvas["order"].append(k)
    canvas["notes"]["c001title"] = {"x": 0, "y": 1150, "text": "Case 001 in the Dollhouse, bigger", "kind": "title1", "maxW": 1330}
    canvas["notes"]["c001close"] = {"x": 0, "y": 2224, "w": 390, "text": "Close-up: the camera follows you room to room, about 2.6 times the size of the board above. Lab 4 and the lobby are drawn from the evidence photos, so what you see in the world matches what you find. The ghosts replay chapter 1: Priya walks out at 8:45 while HALO stays on its dock."}
    canvas["notes"]["c001map"] = {"x": 470, "y": 2224, "w": 390, "text": "Whole building: tap the map and the world shrinks to one strip, with where everyone is now and the night so far underneath. Each case gets its own building from its map of the night: a radio station, a restaurant, a lodge in the snow."}
    json.dump(canvas, open(os.path.join(PROJ, "canvas.json"), "w", encoding="utf-8"), indent=2)
    print("written")
