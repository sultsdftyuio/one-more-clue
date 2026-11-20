"""Detail pass for the eight Case 001 mini-game boards: richer surroundings, more parts, more juice, and a shared win
moment (the reward flies into the header chip, the chip pulses, the card gets three stars).

    python polish.py     # edits ../omc-looks/project/Mini*.dc.html in place (run once on the published versions)
"""
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(HERE, "..", "omc-looks", "project")

ICON = {
    "coffee": '<svg viewBox="0 0 20 20" style="width: 22px; height: 22px"><path d="M4 7 H14 L13 17 H5 Z" fill="#C9A877" stroke="#1B1F3B" stroke-width="1.8"/><path d="M14 9 Q18 9 17 12 Q16.5 14 13.6 14" fill="none" stroke="#1B1F3B" stroke-width="1.8"/></svg>',
    "bulb": '<svg viewBox="0 0 20 20" style="width: 22px; height: 22px"><path d="M10 2 A6 6 0 0 1 14 12.5 L13.4 15 H6.6 L6 12.5 A6 6 0 0 1 10 2 Z" fill="#F2B33D" stroke="#1B1F3B" stroke-width="1.6"/><rect x="7" y="15.5" width="6" height="3" rx="1" fill="#1B1F3B"/></svg>',
    "drop": '<svg viewBox="0 0 20 20" style="width: 22px; height: 22px"><path d="M10 2 C10 2 4 9 4 13 A6 6 0 0 0 16 13 C16 9 10 2 10 2 Z" fill="#7FC8FF" stroke="#1B1F3B" stroke-width="1.8"/></svg>',
}
STAR = '<svg class="{c}" viewBox="0 0 20 20" style="width: 22px; height: 22px"><path d="M10 1.5 L12.6 7 L18.5 7.6 L14 11.6 L15.3 17.6 L10 14.5 L4.7 17.6 L6 11.6 L1.5 7.6 L7.4 7 Z" fill="#F2B33D" stroke="#1B1F3B" stroke-width="1.6" stroke-linejoin="round"/></svg>'


def common(loop, s, start, icon):
    """Keyframes and markup for the win moment; s = % of the loop when the reward card arrives."""
    x0, y0 = start
    css = (
        f"@keyframes flyD{{0%,{s - 5:.1f}%{{transform:translate({x0 - 18}px,{y0 - 18}px) scale(1.4);opacity:0}}{s - 4.5:.1f}%{{opacity:1}}"
        f"{s - 0.5:.1f}%{{transform:translate(319px,18px) scale(.7);opacity:1}}{s:.1f}%,100%{{transform:translate(319px,18px) scale(.7);opacity:0}}}}"
        f"@keyframes chipD{{0%,{s - 0.6:.1f}%{{transform:scale(1);box-shadow:0 0 0 0 rgba(242,179,61,0)}}{s + 1:.1f}%{{transform:scale(1.18);box-shadow:0 0 0 7px rgba(242,179,61,.5)}}"
        f"{s + 3:.1f}%,100%{{transform:scale(1);box-shadow:0 0 0 14px rgba(242,179,61,0)}}}}"
        + "".join(
            f"@keyframes st{i}D{{0%,{s + 4 + i * 1.6:.1f}%{{transform:scale(0) rotate(-40deg)}}{s + 5.6 + i * 1.6:.1f}%{{transform:scale(1.35) rotate(12deg)}}"
            f"{s + 6.6 + i * 1.6:.1f}%,95%{{transform:scale(1) rotate(0deg)}}100%{{transform:scale(0)}}}}.st{i}{{transform-box:fill-box;transform-origin:center;animation:st{i}D {loop}s ease-out infinite}}"
            for i in range(3))
        + f".fly{{animation:flyD {loop}s cubic-bezier(.5,0,.3,1) infinite}}.chip{{animation:chipD {loop}s ease-out infinite}}"
    )
    fly = (f'  <div class="fly" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 36px; height: 36px; border-radius: 50%; '
           f'background: #fff4e0; border: 2.5px solid #1b1f3b; box-sizing: border-box; display: grid; place-items: center; box-shadow: 0 0 14px rgba(242, 179, 61, 0.9)">{ICON[icon]}</div>\n')
    stars = ('    <div aria-hidden="true" style="position: absolute; right: 14px; bottom: 12px; display: flex; gap: 2px">'
             + "".join(STAR.format(c=f"st{i}") for i in range(3)) + "</div>\n")
    return css, fly, stars


def edit(name, loop, s, start, icon, subs, css=""):
    path = os.path.join(PROJ, name)
    text = io.open(path, encoding="utf-8").read()
    if "class=\"fly\"" in text:
        print("already polished:", name)
        return
    ccss, fly, stars = common(loop, s, start, icon)
    allsubs = list(subs) + [
        ("@media (prefers-reduced-motion: reduce)", ccss + css + "\n@media (prefers-reduced-motion: reduce)"),
        ('<span style="display: flex; align-items: center; gap: 6px; background: #fff4e0;', '<span class="chip" style="display: flex; align-items: center; gap: 6px; background: #fff4e0;'),
        ('  <div style="position: absolute; left: 16px; right: 16px; top: 16px; display: flex; align-items: center; gap: 12px">',
         fly + '  <div style="position: absolute; left: 16px; right: 16px; top: 16px; display: flex; align-items: center; gap: 12px">'),
        ("    </div>\n  </div>\n</div>\n</x-dc>", "    </div>\n" + stars + "  </div>\n</div>\n</x-dc>"),
    ]
    for a, b in allsubs:
        n = text.count(a)
        assert n == 1, f"{name}: anchor found {n} times: {a[:70]!r}"
        text = text.replace(a, b)
    text = text.replace("@media (prefers-reduced-motion: reduce){", "@media (prefers-reduced-motion: reduce){.fly,.chip,.st0,.st1,.st2,.det{animation:none!important}", 1)
    io.open(path, "w", encoding="utf-8").write(text)
    print("polished:", name)


def before(anchor, html):
    return (anchor, html + anchor)


def after(anchor, html):
    return (anchor, anchor + html)


# ---------------------------------------------------------------------------
# Coffee run: the lobby around the machine, screws and stickers, a coin going in, a puff when the cup lands
edit("MiniCoffee.dc.html", 9, 57.7, (195, 470), "coffee", [
    before('  <div aria-hidden="true" style="position: absolute; inset: 0; background: radial-gradient(120% 80% at 50% 45%', """  <div aria-hidden="true" style="position: absolute; left: 30px; top: 150px; width: 330px; height: 420px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 226, 170, 0.5), rgba(255, 226, 170, 0))"></div>
  <p aria-hidden="true" style="position: absolute; left: -14px; top: 106px; margin: 0; font: 900 40px/1 'Nunito', sans-serif; color: #1b1f3b; opacity: 0.13; letter-spacing: 6px; white-space: nowrap">HALDEN INNOVATION</p>
  <div aria-hidden="true" style="position: absolute; left: -30px; top: 296px; width: 80px; height: 116px; box-sizing: border-box; border-radius: 6px; background: #B88A5A; border: 3px solid #1b1f3b"></div>
  <div aria-hidden="true" style="position: absolute; left: 6px; top: 308px; width: 30px; height: 36px; background: #F2EFE6; border: 1.5px solid #1b1f3b; transform: rotate(-5deg)"></div>
  <div aria-hidden="true" style="position: absolute; left: 10px; top: 354px; width: 32px; height: 28px; background: #F6D36B; border: 1.5px solid #1b1f3b; transform: rotate(4deg)"></div>
  <i aria-hidden="true" style="position: absolute; left: 18px; top: 306px; width: 6px; height: 6px; border-radius: 50%; background: #D6312F"></i>
  <i aria-hidden="true" style="position: absolute; left: 24px; top: 352px; width: 6px; height: 6px; border-radius: 50%; background: #D6312F"></i>
  <svg viewBox="0 0 80 150" aria-hidden="true" style="position: absolute; left: 316px; top: 504px; width: 80px; height: 150px">
    <path d="M40 92 Q18 60 6 30 Q30 46 40 80" fill="#3E8A56" stroke="#1B1F3B" stroke-width="2.5"/>
    <path d="M40 92 Q58 52 74 26 Q62 60 42 84" fill="#4FA066" stroke="#1B1F3B" stroke-width="2.5"/>
    <path d="M40 94 Q34 50 40 8 Q50 52 42 92" fill="#2F7A48" stroke="#1B1F3B" stroke-width="2.5"/>
    <path d="M18 92 H62 L56 142 H24 Z" fill="#C0563F" stroke="#1B1F3B" stroke-width="3"/>
    <rect x="14" y="88" width="52" height="10" rx="3" fill="#A8462F" stroke="#1B1F3B" stroke-width="2.5"/>
  </svg>
  <svg viewBox="0 0 40 60" aria-hidden="true" style="position: absolute; left: 20px; top: 598px; width: 40px; height: 60px">
    <path d="M20 4 L36 54 H4 Z" fill="#F2B33D" stroke="#1B1F3B" stroke-width="2.5"/>
    <rect x="2" y="52" width="36" height="6" rx="2" fill="#1B1F3B"/>
    <path d="M13 36 H27 M16 26 H24" stroke="#1B1F3B" stroke-width="3"/>
  </svg>
  <div aria-hidden="true" style="position: absolute; left: 50px; top: 636px; width: 290px; height: 64px; border-radius: 50%; background: radial-gradient(closest-side, rgba(255, 220, 160, 0.4), rgba(255, 220, 160, 0))"></div>
"""),
    ('<svg viewBox="0 0 300 560" role="img"', '<svg class="shk" viewBox="0 0 300 560" role="img"'),
    before('    <rect x="22" y="524" width="256" height="14" rx="4" fill="#2E3240"/>\n  </svg>', """    <g fill="#9AA3B8" stroke="#1B1F3B" stroke-width="1.5"><circle cx="21" cy="21" r="3.5"/><circle cx="279" cy="21" r="3.5"/><circle cx="21" cy="535" r="3.5"/><circle cx="279" cy="535" r="3.5"/></g>
    <rect x="24" y="92" width="182" height="6" rx="3" fill="#BFE3FF" opacity="0.9"/>
    <g fill="none" stroke="#FFF4E0" stroke-width="2.4" stroke-linejoin="round"><path d="M42 44 h14 l-2 14 h-10 z"/><path d="M56 47 q5 0 4 5 q-1 4 -5 4"/><path d="M244 44 h14 l-2 14 h-10 z"/><path d="M258 47 q5 0 4 5 q-1 4 -5 4"/></g>
    <g fill="none" stroke="#7DFFB0" stroke-width="2" stroke-linecap="round"><path d="M275 297 q4 6 0 12"/><path d="M280 294 q6 9 0 18"/></g>
    <g transform="rotate(12 194 390)"><rect x="184" y="380" width="20" height="20" rx="4" fill="#F2B33D" stroke="#1B1F3B" stroke-width="2"/><path d="M189 389 l4 4 l7 -8" fill="none" stroke="#1B1F3B" stroke-width="2.2"/></g>
    <g stroke="#1B1F3B" stroke-width="2.5" stroke-linecap="round" opacity="0.55"><path d="M44 528 H112"/><path d="M188 528 H256"/></g>
    <rect x="232" y="380" width="34" height="20" rx="4" fill="#2A2E38" stroke="#1B1F3B" stroke-width="2"/>
    <rect x="236" y="385" width="26" height="4" rx="2" fill="#F2B33D" opacity="0.8"/><rect x="236" y="392" width="16" height="3" rx="1.5" fill="#9AA3B8"/>
"""),
    before('  <div class="fg" aria-hidden="true"', """  <div class="coin det" aria-hidden="true" style="position: absolute; left: 276px; top: 262px; width: 16px; height: 16px; box-sizing: border-box; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #FFE9A8, #E8B04A 60%, #B8862A); border: 2px solid #1b1f3b"></div>
  <div class="slot det" aria-hidden="true" style="position: absolute; left: 270px; top: 300px; width: 28px; height: 40px; border-radius: 8px; box-shadow: 0 0 16px 6px rgba(125, 255, 176, 0.7)"></div>
  <i class="puff det" aria-hidden="true" style="position: absolute; left: 150px; top: 506px; width: 28px; height: 28px; border-radius: 50%; background: rgba(255, 244, 224, 0.55)"></i>
  <i class="puff det" aria-hidden="true" style="position: absolute; left: 182px; top: 500px; width: 34px; height: 34px; border-radius: 50%; background: rgba(255, 244, 224, 0.5); animation-delay: .05s"></i>
  <i class="puff det" aria-hidden="true" style="position: absolute; left: 218px; top: 508px; width: 26px; height: 26px; border-radius: 50%; background: rgba(255, 244, 224, 0.55); animation-delay: .1s"></i>
"""),
], css="""@keyframes coinD{0%{transform:translateY(-30px);opacity:0}2%{opacity:1;transform:translateY(-30px)}7%{transform:translateY(50px) scale(.8);opacity:1}8%,100%{transform:translateY(50px) scale(.6);opacity:0}}
@keyframes slotD{0%,6.5%,14%,100%{opacity:0}8%,11%{opacity:1}}
@keyframes puffD{0%,46%{transform:scale(.3);opacity:0}47%{opacity:.85}53%,100%{transform:scale(1.7);opacity:0}}
@keyframes shkD{0%,27.7%,30.5%,100%{transform:translate(0,0)}28.2%{transform:translate(-3px,1px)}28.8%{transform:translate(3px,-1px)}29.4%{transform:translate(-2px,0)}30%{transform:translate(2px,1px)}}
.coin{animation:coinD 9s ease-in infinite}.slot{animation:slotD 9s ease-out infinite}.puff{animation:puffD 9s ease-out infinite}.shk{animation:shkD 9s linear infinite}
""")

# Penalty: floodlight beams, the 2-1 scoreboard, scarves in the crowd, icons on the ad boards, corner flags, the ball's shadow and a blur trail
BALL_SVG = """<svg class="spin" viewBox="-30 -30 60 60" style="width: 56px; height: 56px; display: block"><circle r="27" fill="#FFF4E0" stroke="#1B1F3B" stroke-width="3.5"/><path d="M0 -9 L8.6 -2.8 L5.3 7.3 L-5.3 7.3 L-8.6 -2.8 Z" fill="#1B1F3B"/></svg>"""
edit("MiniPenalty.dc.html", 9, 53.3, (292, 268), "drop", [
    before('  <div aria-hidden="true" style="position: absolute; inset: 0; background: radial-gradient(110% 70% at 50% 60%', """  <div aria-hidden="true" style="position: absolute; left: 0; top: 60px; width: 390px; height: 520px; background: linear-gradient(160deg, rgba(255, 246, 220, 0.18), rgba(255, 246, 220, 0) 62%); clip-path: polygon(0 0, 26% 0, 72% 100%, 18% 100%)"></div>
  <div aria-hidden="true" style="position: absolute; left: 0; top: 60px; width: 390px; height: 520px; background: linear-gradient(200deg, rgba(255, 246, 220, 0.18), rgba(255, 246, 220, 0) 62%); clip-path: polygon(74% 0, 100% 0, 82% 100%, 28% 100%)"></div>
  <div class="wave det" aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 146px; height: 64px; opacity: 0.75; background: radial-gradient(circle at 7px 9px, #F2B33D 3px, rgba(0, 0, 0, 0) 3.5px) 0 0 / 28px 13px, radial-gradient(circle at 21px 9px, #3F6FD8 3px, rgba(0, 0, 0, 0) 3.5px) 0 0 / 28px 13px"></div>
  <div aria-hidden="true" style="position: absolute; left: 132px; top: 84px; width: 126px; height: 44px; box-sizing: border-box; border-radius: 8px; background: #0B0E1C; border: 3px solid #1b1f3b; box-shadow: 0 0 0 2px #3A4466, 0 6px 14px rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; gap: 9px">
    <i style="width: 10px; height: 18px; border-radius: 2px; background: #3F6FD8"></i><span style="font: 900 22px/1 'Nunito', sans-serif; color: #FFB347; text-shadow: 0 0 8px rgba(255, 160, 60, 0.9); letter-spacing: 2px">2–1</span><i style="width: 10px; height: 18px; border-radius: 2px; background: #EF5B5B"></i>
  </div>
  <svg viewBox="0 0 390 844" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px">
    <g fill="none" stroke="#FFF4E0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M43 216 h11 l-1.5 11 h-8 z M54 218 q4 0 3 4 q-1 3 -4 3"/>
      <path d="M146 214 a5 5 0 0 1 3.5 8.6 l-0.4 2.2 h-6.2 l-0.4 -2.2 a5 5 0 0 1 3.5 -8.6 z M143.5 227 h5"/>
      <path d="M241 219 m-5 0 a5 5 0 1 0 10 0 a5 5 0 1 0 -10 0 M244.5 222.5 l4.5 4.5"/>
      <path d="M342 213 l-5 8 h4 l-1.5 7 l6 -9 h-4 l1.5 -6 z"/>
    </g>
    <g stroke="#1B1F3B" stroke-width="2"><path d="M8 388 V352" stroke="#FFF4E0" stroke-width="3"/><path d="M8 352 L26 358 L8 364 Z" fill="#F2B33D"/><path d="M382 388 V352" stroke="#FFF4E0" stroke-width="3"/><path d="M382 352 L364 358 L382 364 Z" fill="#EF5B5B"/></g>
    <path d="M104 844 Q195 784 286 844" fill="none" stroke="#fff" stroke-width="3" opacity="0.8"/>
  </svg>
"""),
    ('  <svg viewBox="0 0 390 844" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; pointer-events: none">',
     '  <svg class="gshk" viewBox="0 0 390 844" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; pointer-events: none">'),
    before('  <div class="ball" aria-hidden="true"', f"""  <div class="bsh det" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 44px; height: 12px; border-radius: 50%; background: rgba(0, 0, 0, 0.38)"></div>
  <div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; opacity: 0.18"><div class="ball" style="position: absolute; left: 0; top: 0; width: 56px; height: 56px; animation-delay: .1s">{BALL_SVG}</div></div>
  <div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; opacity: 0.35"><div class="ball" style="position: absolute; left: 0; top: 0; width: 56px; height: 56px; animation-delay: .05s">{BALL_SVG}</div></div>
"""),
], css="""@keyframes waveD{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes bshD{0%,26.67%{transform:translate(173px,726px) scale(1);opacity:1}34.4%{transform:translate(268px,386px) scale(.45)}51%{transform:translate(268px,386px) scale(.45);opacity:1}53.3%,96%{transform:translate(268px,386px) scale(.45);opacity:0}96.1%{transform:translate(173px,726px) scale(1);opacity:0}100%{transform:translate(173px,726px) scale(1);opacity:1}}
@keyframes gshkD{0%,34.3%,37.6%,100%{transform:translate(0,0)}34.8%{transform:translate(-3px,1px)}35.4%{transform:translate(3px,-1px)}36%{transform:translate(-2px,1px)}36.8%{transform:translate(2px,0)}}
.wave{animation:waveD .5s ease-in-out infinite}.bsh{animation:bshD 9s linear infinite}.gshk{animation:gshkD 9s linear infinite}
""")

# Lights out: storm clouds, a far flicker, icons and screws on the fuse plates, your torch sweeping the dark panel, "Got it!" pings
edit("MiniLights.dc.html", 10, 65.9, (195, 520), "bulb", [
    before('  <div style="position: absolute; left: 16px; top: 98px; width: 358px; height: 188px;', """  <div class="cl1 det" aria-hidden="true" style="position: absolute; left: -70px; top: 50px; width: 270px; height: 74px; border-radius: 50%; background: radial-gradient(closest-side, rgba(44, 40, 76, 0.95), rgba(44, 40, 76, 0))"></div>
  <div class="cl2 det" aria-hidden="true" style="position: absolute; left: 170px; top: 36px; width: 290px; height: 84px; border-radius: 50%; background: radial-gradient(closest-side, rgba(52, 46, 88, 0.92), rgba(52, 46, 88, 0))"></div>
  <div class="fl2 det" aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 0; height: 320px; background: radial-gradient(60% 50% at 72% 18%, rgba(190, 210, 255, 0.55), rgba(190, 210, 255, 0))"></div>
"""),
    before("    </svg>\n    <div class=\"tap\"", """      <g fill="none" stroke="#FFF4E0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.95">
        <path d="M42 92 a5 5 0 0 1 3.5 8.6 l-0.4 2 h-6.2 l-0.4 -2 a5 5 0 0 1 3.5 -8.6 z M39.5 105 h5"/>
        <path d="M114 92 v4 M120 92 v4 M111 96 h12 v3 a6 6 0 0 1 -12 0 z M117 105 v3"/>
        <path d="M190 98 m-6 0 a6 6 0 1 0 12 0 a6 6 0 1 0 -12 0 M190 92 v12 M184 98 h12"/>
        <path d="M268 90 l-5 8 h4 l-1.5 7 l6 -9 h-4 l1.5 -6 z"/>
      </g>
      <g fill="#8E95A8" stroke="#1B1F3B" stroke-width="1.5">
        <circle cx="42" cy="208" r="3.5"/><circle cx="82" cy="208" r="3.5"/><circle cx="117" cy="208" r="3.5"/><circle cx="157" cy="208" r="3.5"/>
        <circle cx="192" cy="208" r="3.5"/><circle cx="232" cy="208" r="3.5"/><circle cx="267" cy="208" r="3.5"/><circle cx="307" cy="208" r="3.5"/>
      </g>
"""),
    before('    <div class="tap" aria-hidden="true" style="position: absolute; left: 97px; top: 110px;', """    <div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 350px; height: 290px; border-radius: 16px; overflow: hidden; pointer-events: none">
      <div class="torch det" style="position: absolute; left: 0; top: 0; width: 1050px; height: 870px; background: radial-gradient(circle at 525px 435px, rgba(255, 246, 220, 0.12) 0, rgba(5, 4, 12, 0) 70px, rgba(5, 4, 12, 0.8) 122px)"></div>
    </div>
"""),
    before('  <div class="flash" aria-hidden="true"', """  <p class="pg1 det" style="position: absolute; left: 82px; top: 606px; margin: 0; font: 900 11px/1 'Nunito', sans-serif; color: #1b1f3b; background: #fff4e0; border: 2px solid #3FB8AF; border-radius: 999px; padding: 4px 8px; white-space: nowrap">Got it!</p>
  <p class="pg3 det" style="position: absolute; left: 232px; top: 606px; margin: 0; font: 900 11px/1 'Nunito', sans-serif; color: #1b1f3b; background: #fff4e0; border: 2px solid #EF5B5B; border-radius: 999px; padding: 4px 8px; white-space: nowrap">Got it!</p>
  <p class="pg4 det" style="position: absolute; left: 307px; top: 606px; margin: 0; font: 900 11px/1 'Nunito', sans-serif; color: #1b1f3b; background: #fff4e0; border: 2px solid #9B87F5; border-radius: 999px; padding: 4px 8px; white-space: nowrap">Got it!</p>
"""),
], css="""@keyframes cloudD{0%,100%{transform:translateX(0)}50%{transform:translateX(18px)}}
@keyframes fl2D{0%,39%,43.5%,100%{opacity:0}40%{opacity:.85}41%{opacity:.2}42%{opacity:.6}}
@keyframes torchD{0%,3%{opacity:0;transform:translate(-465px,-315px)}9%{opacity:1;transform:translate(-465px,-315px)}25%{transform:translate(-325px,-265px)}40%,46%{transform:translate(-388px,-285px)}56%{transform:translate(-245px,-295px);opacity:1}61%,100%{transform:translate(-245px,-295px);opacity:0}}
@keyframes pg1D{0%,21.5%{opacity:0;transform:translate(-50%,6px) scale(.6)}23%{opacity:1;transform:translate(-50%,0) scale(1.12)}24%,29%{opacity:1;transform:translate(-50%,0) scale(1)}31%,100%{opacity:0;transform:translate(-50%,0)}}
@keyframes pg3D{0%,33.5%{opacity:0;transform:translate(-50%,6px) scale(.6)}35%{opacity:1;transform:translate(-50%,0) scale(1.12)}36%,41%{opacity:1;transform:translate(-50%,0) scale(1)}43%,100%{opacity:0;transform:translate(-50%,0)}}
@keyframes pg4D{0%,55.5%{opacity:0;transform:translate(-50%,6px) scale(.6)}57%{opacity:1;transform:translate(-50%,0) scale(1.12)}58%,62%{opacity:1;transform:translate(-50%,0) scale(1)}64%,100%{opacity:0;transform:translate(-50%,0)}}
.cl1{animation:cloudD 9s ease-in-out infinite}.cl2{animation:cloudD 12s ease-in-out infinite reverse}.fl2{animation:fl2D 10s linear infinite}.torch{animation:torchD 10s ease-in-out infinite}
.pg1{animation:pg1D 10s ease-out infinite}.pg3{animation:pg3D 10s ease-out infinite}.pg4{animation:pg4D 10s ease-out infinite}
""")

# Print it: a rainy window and a bench with tools, the printer's light strip, fan and spinning spool, a hot nozzle, sparks as each layer lands
SPARKS = "".join(f'<i class="spk sp{k} det" style="position: absolute; left: 0; top: 0; width: 5px; height: 5px; border-radius: 50%; background: #FFB347; box-shadow: 0 0 6px #FF9A4A; animation-delay: {{d}}s"></i>' for k in range(1, 5))
edit("MiniPrint.dc.html", 10, 65.9, (195, 490), "bulb", [
    before('  <svg viewBox="0 0 300 430" role="img"', """  <div aria-hidden="true" style="position: absolute; left: -46px; top: 270px; width: 84px; height: 160px; box-sizing: border-box; border-radius: 6px; background: linear-gradient(#0B1024, #26305E); border: 5px solid #3A4466"></div>
  <div class="rainp det" aria-hidden="true" style="position: absolute; left: -41px; top: 275px; width: 74px; height: 150px; opacity: 0.4; background-image: repeating-linear-gradient(105deg, rgba(200, 210, 255, 0) 0 9px, rgba(200, 210, 255, 0.7) 9px 10px, rgba(200, 210, 255, 0) 10px 18px); background-size: 60px 80px"></div>
  <div aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 614px; height: 18px; background: linear-gradient(#8A6A4A, #6B5640); border-top: 4px solid #1b1f3b"></div>
  <svg viewBox="0 0 390 80" aria-hidden="true" style="position: absolute; left: 0; top: 632px; width: 390px; height: 80px">
    <g stroke="#1B1F3B" stroke-width="2.5" stroke-linejoin="round">
      <path d="M22 26 H104 V36 H62 L56 48 H48 L54 36 H22 Z" fill="#C9CDD6"/><rect x="60" y="20" width="10" height="22" fill="#9AA3B8"/>
      <circle cx="340" cy="34" r="20" fill="#3FB8AF"/><circle cx="340" cy="34" r="7" fill="#1B1F3B"/>
      <path d="M278 46 L282 24 Q286 16 292 24 L296 46 Z" fill="#E8B04A"/><circle cx="287" cy="16" r="7" fill="#E8B04A"/><circle cx="285" cy="15" r="1.5" fill="#1B1F3B" stroke="none"/><circle cx="290" cy="15" r="1.5" fill="#1B1F3B" stroke="none"/>
    </g>
  </svg>
"""),
    before('    <rect x="12" y="34" width="5" height="372" rx="2" fill="#fff" opacity="0.07"/>\n  </svg>', """    <defs><linearGradient id="coneG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E8F4FF" stop-opacity="0.32"/><stop offset="1" stop-color="#E8F4FF" stop-opacity="0"/></linearGradient></defs>
    <path d="M36 69 L264 69 L270 330 L30 330 Z" fill="url(#coneG)"/>
    <rect x="34" y="63" width="232" height="5" rx="2" fill="#E8F4FF"/>
    <g fill="#9AA3B8" stroke="#1B1F3B" stroke-width="1.5"><circle cx="22" cy="42" r="3.5"/><circle cx="278" cy="42" r="3.5"/><circle cx="22" cy="398" r="3.5"/><circle cx="278" cy="398" r="3.5"/></g>
    <circle cx="276" cy="212" r="13" fill="#1B1F3B"/>
    <g class="fan det"><path d="M276 212 L276 201 M276 212 L286 218 M276 212 L266 218" stroke="#59617D" stroke-width="4" stroke-linecap="round"/></g>
    <g class="spool det"><path d="M150 4 V40 M134 22 H166" stroke="#B8862A" stroke-width="3" stroke-linecap="round"/></g>
    <rect x="56" y="374" width="44" height="18" rx="4" fill="#3A3F4E" stroke="#1B1F3B" stroke-width="2"/><rect x="62" y="380" width="12" height="6" rx="2" fill="#E8B04A"/><rect x="78" y="380" width="16" height="6" rx="2" fill="#9AA3B8"/>
"""),
    after('      <div style="position: absolute; left: 17px; top: 36px; width: 12px; height: 10px; background: #59617D; clip-path: polygon(0 0, 100% 0, 60% 100%, 40% 100%)"></div>',
          '\n      <div class="det" style="position: absolute; left: 20px; top: 43px; width: 6px; height: 6px; border-radius: 50%; background: #FF9A4A; box-shadow: 0 0 8px 3px rgba(255, 154, 74, 0.85)"></div>'),
    before('  <p class="pop"', "".join(f'  <div aria-hidden="true" style="position: absolute; left: 195px; top: {y}px; width: 0; height: 0">{SPARKS.format(d=d)}</div>\n'
                                       for y, d in ((452, 1.55), (434, 2.85), (416, 4.15), (398, 5.45)))),
], css="""@keyframes spkD{0%{translate:0 0;opacity:0}.5%{opacity:1}4%{translate:var(--dx) var(--dy);opacity:0}100%{opacity:0}}
.spk{animation:spkD 10s ease-out infinite both}.sp1{--dx:-20px;--dy:-10px}.sp2{--dx:20px;--dy:-12px}.sp3{--dx:-10px;--dy:-20px}.sp4{--dx:12px;--dy:-22px}
@keyframes spinD2{to{transform:rotate(360deg)}}
.fan{transform-box:fill-box;transform-origin:center;animation:spinD2 .5s linear infinite}.spool{transform-box:view-box;transform-origin:150px 22px;animation:spinD2 3s linear infinite}
@keyframes rainPD{to{background-position:-20px 80px}}.rainp{animation:rainPD .8s linear infinite}
""")

# Rewire: an exit sign and the corridor light, brushed metal, bevelled tiles, copper wires, conduits, status LEDs, sparks at the plug, a flicker
SPK2 = "".join(f'<i class="spk2 sq{k} det" style="position: absolute; left: 0; top: 0; width: 5px; height: 5px; border-radius: 50%; background: #FFE08A; box-shadow: 0 0 6px #FFD060"></i>' for k in range(1, 7))
edit("MiniRewire.dc.html", 10, 57.9, (356, 408), "bulb", [
    before('  <div class="room" aria-hidden="true"', """  <div aria-hidden="true" style="position: absolute; left: 20px; top: 134px; width: 58px; height: 20px; box-sizing: border-box; border-radius: 3px; background: #1E7A4E; border: 2px solid #1b1f3b"></div>
  <svg viewBox="0 0 20 20" aria-hidden="true" style="position: absolute; left: 24px; top: 136px; width: 16px; height: 16px"><circle cx="11" cy="3.5" r="2" fill="#E8FFF2"/><path d="M10 6 L7 11 L10 12 L8 18 M10 8 L14 11 M7 11 L4 10 M10 12 L13 16" stroke="#E8FFF2" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>
  <div aria-hidden="true" style="position: absolute; left: 44px; top: 140px; width: 26px; height: 8px; border-radius: 2px; background: #E8FFF2; opacity: 0.8"></div>
  <div aria-hidden="true" style="position: absolute; left: 132px; top: 132px; width: 126px; height: 14px; box-sizing: border-box; border-radius: 4px; background: #9EA4B4; border: 2px solid #1b1f3b"></div>
  <div class="lampon det" aria-hidden="true" style="position: absolute; left: 132px; top: 132px; width: 126px; height: 14px; box-sizing: border-box; border-radius: 4px; background: #FFFDF2; border: 2px solid #1b1f3b; box-shadow: 0 6px 30px 10px rgba(255, 246, 220, 0.7)"></div>
  <div aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 606px; height: 30px; background: linear-gradient(rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0))"></div>
"""),
    after('  <div aria-hidden="true" style="position: absolute; left: 20px; top: 180px; width: 350px; height: 408px; border-radius: 10px; background: #1E2232"></div>',
          '\n  <div aria-hidden="true" style="position: absolute; left: 20px; top: 180px; width: 350px; height: 408px; border-radius: 10px; background: repeating-linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0 2px, rgba(0, 0, 0, 0.04) 2px 4px)"></div>'),
    (".tile{position:absolute;width:64px;height:64px;box-sizing:border-box;border-radius:12px;background:#2A2E3E;border:3px solid #1B1F3B;box-shadow:inset 0 -4px 0 rgba(0,0,0,.25)}",
     ".tile{position:absolute;width:64px;height:64px;box-sizing:border-box;border-radius:12px;background:linear-gradient(#323748,#262A39);border:3px solid #1B1F3B;box-shadow:inset 0 -4px 0 rgba(0,0,0,.28),inset 0 2px 0 rgba(255,255,255,.08)}"),
    (".w{fill:none;stroke:#8A6A3A;stroke-width:10;stroke-linecap:round}", ".w{fill:none;stroke:url(#cu);stroke-width:10;stroke-linecap:round}"),
    after('  <svg viewBox="0 0 390 844" aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; pointer-events: none">', """
    <defs><linearGradient id="cu" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="64" y2="64"><stop offset="0" stop-color="#B48A52"/><stop offset="0.5" stop-color="#8A6A3A"/><stop offset="1" stop-color="#6E5230"/></linearGradient></defs>
    <g stroke="#1B1F3B" stroke-width="3"><rect x="62" y="110" width="16" height="60" fill="#59617D"/><rect x="312" y="110" width="16" height="60" fill="#59617D"/></g>
    <g fill="#8E95A8" stroke="#1B1F3B" stroke-width="1.5"><circle cx="32" cy="192" r="4"/><circle cx="358" cy="192" r="4"/><circle cx="32" cy="576" r="4"/><circle cx="358" cy="576" r="4"/></g>
    <g stroke="#1B1F3B" stroke-width="2"><circle cx="350" cy="232" r="5" fill="#5A1E24"/><circle cx="350" cy="248" r="5" fill="#5A1E24"/></g>
    <g class="ledr det"><circle cx="350" cy="232" r="5" fill="#EF5B5B"/></g><g class="ledg det"><circle cx="350" cy="248" r="5" fill="#3DD68C"/><circle cx="350" cy="248" r="11" fill="#3DD68C" opacity="0.3"/></g>"""),
    before('  <p class="prompt"', f'  <div aria-hidden="true" style="position: absolute; left: 40px; top: 340px; width: 0; height: 0">{SPK2}</div>\n'),
    ("@keyframes bulbOnD{0%,45.9%{opacity:0}46%,96%{opacity:1}99%,100%{opacity:0}}",
     "@keyframes bulbOnD{0%,45.9%{opacity:0}46%{opacity:1}46.8%{opacity:.15}47.6%{opacity:1}48.2%{opacity:.35}49%,96%{opacity:1}99%,100%{opacity:0}}"),
], css="""@keyframes spk2D{0%,45.9%{translate:0 0;opacity:0}46.2%{opacity:1}51%{translate:var(--dx) var(--dy);opacity:0}100%{opacity:0}}
.spk2{animation:spk2D 10s ease-out infinite}.sq1{--dx:-16px;--dy:-18px}.sq2{--dx:14px;--dy:-20px}.sq3{--dx:22px;--dy:2px}.sq4{--dx:-20px;--dy:8px}.sq5{--dx:6px;--dy:20px}.sq6{--dx:-6px;--dy:-26px}
@keyframes lampD{0%,47%{opacity:0}47.5%{opacity:1}48%{opacity:.3}49%,95%{opacity:1}100%{opacity:0}}.lampon{animation:lampD 10s linear infinite}
@keyframes ledrD{0%,45.9%{opacity:1}46%,96%{opacity:0}100%{opacity:1}}@keyframes ledgD{0%,45.9%{opacity:0}46%,96%{opacity:1}100%{opacity:0}}
.ledr{animation:ledrD 10s steps(1) infinite}.ledg{animation:ledgD 10s steps(1) infinite}
""")

# Tea for Squires: a rainy window with a plant, a pendant lamp over the mug, a jar shelf, a socket and cable, splashes, a swirl in the tea
SPL = "".join(f'<i class="spl sl{k} det" style="position: absolute; left: 0; top: 0; width: 6px; height: 6px; border-radius: 50%; background: {{c}}; border: 1px solid #1b1f3b; animation-delay: {{d}}s"></i>' for k in range(1, 6))
edit("MiniTea.dc.html", 10, 65.9, (193, 440), "drop", [
    before('  <div aria-hidden="true" style="position: absolute; left: 0; right: 0; top: 520px; height: 16px;', """  <div aria-hidden="true" style="position: absolute; left: 228px; top: 118px; width: 144px; height: 118px; box-sizing: border-box; border-radius: 6px; background: linear-gradient(#0B1024, #26305E); border: 6px solid #F2EFE6; box-shadow: 0 0 0 3px #1b1f3b"></div>
  <div aria-hidden="true" style="position: absolute; left: 298px; top: 118px; width: 4px; height: 118px; background: #F2EFE6"></div>
  <i aria-hidden="true" style="position: absolute; left: 334px; top: 136px; width: 18px; height: 18px; border-radius: 50%; background: #F2EBD8; box-shadow: 0 0 14px 4px rgba(242, 235, 216, 0.5)"></i>
  <div class="raint det" aria-hidden="true" style="position: absolute; left: 234px; top: 124px; width: 132px; height: 106px; opacity: 0.4; background-image: repeating-linear-gradient(105deg, rgba(200, 210, 255, 0) 0 9px, rgba(200, 210, 255, 0.7) 9px 10px, rgba(200, 210, 255, 0) 10px 18px); background-size: 60px 80px"></div>
  <div aria-hidden="true" style="position: absolute; left: 222px; top: 236px; width: 156px; height: 8px; border-radius: 2px; background: #E8DCC4; box-shadow: 0 0 0 2.5px #1b1f3b"></div>
  <svg viewBox="0 0 40 50" aria-hidden="true" style="position: absolute; left: 236px; top: 196px; width: 34px; height: 42px"><path d="M20 30 Q8 22 10 8 Q16 18 20 26 Q24 14 32 6 Q32 22 20 30" fill="#4FA066" stroke="#1B1F3B" stroke-width="2"/><path d="M10 30 H30 L27 46 H13 Z" fill="#C0563F" stroke="#1B1F3B" stroke-width="2.5"/></svg>
  <div aria-hidden="true" style="position: absolute; left: 192px; top: 96px; width: 2px; height: 150px; background: #1b1f3b"></div>
  <div aria-hidden="true" style="position: absolute; left: 167px; top: 242px; width: 52px; height: 26px; box-sizing: border-box; border-radius: 26px 26px 4px 4px; background: #3F6FA0; border: 2.5px solid #1b1f3b"></div>
  <div aria-hidden="true" style="position: absolute; left: 182px; top: 264px; width: 22px; height: 8px; border-radius: 0 0 11px 11px; background: #FFE9B0; box-shadow: 0 4px 18px 6px rgba(255, 220, 150, 0.7)"></div>
  <div aria-hidden="true" style="position: absolute; left: 70px; top: 268px; width: 246px; height: 256px; background: linear-gradient(rgba(255, 220, 150, 0.32), rgba(255, 220, 150, 0)); clip-path: polygon(45% 0, 55% 0, 100% 100%, 0 100%)"></div>
  <div aria-hidden="true" style="position: absolute; left: 58px; top: 292px; width: 108px; height: 6px; border-radius: 2px; background: #8A6A4A; box-shadow: 0 0 0 2px #1b1f3b"></div>
  <svg viewBox="0 0 108 30" aria-hidden="true" style="position: absolute; left: 58px; top: 264px; width: 108px; height: 30px">
    <g stroke="#1B1F3B" stroke-width="2"><rect x="6" y="6" width="22" height="22" rx="4" fill="#EFE4CC"/><rect x="5" y="2" width="24" height="6" rx="2" fill="#6B4A2E"/><rect x="42" y="4" width="22" height="24" rx="4" fill="#EFE4CC"/><rect x="41" y="0" width="24" height="6" rx="2" fill="#3F6FA0"/><rect x="78" y="8" width="22" height="20" rx="4" fill="#EFE4CC"/><rect x="77" y="4" width="24" height="6" rx="2" fill="#EF5B5B"/></g>
    <path d="M12 18 q5 -7 10 0 q-5 5 -10 0" fill="#4FA066"/><ellipse cx="53" cy="18" rx="4" ry="5.5" fill="#6B4A2E"/><rect x="85" y="15" width="8" height="8" fill="#FFF4E0" stroke="#1B1F3B" stroke-width="1.5"/>
  </svg>
  <div aria-hidden="true" style="position: absolute; left: 70px; top: 456px; width: 22px; height: 26px; box-sizing: border-box; border-radius: 4px; background: #F2EFE6; border: 2px solid #1b1f3b"></div>
  <i aria-hidden="true" style="position: absolute; left: 76px; top: 464px; width: 3px; height: 7px; background: #1b1f3b"></i><i aria-hidden="true" style="position: absolute; left: 83px; top: 464px; width: 3px; height: 7px; background: #1b1f3b"></i>
"""),
    before("  </svg>\n\n  <div class=\"nerv\"", """    <path d="M60 518 Q40 512 50 492 Q58 480 80 478" fill="none" stroke="#1B1F3B" stroke-width="3"/>
    <g class="swirl det"><path d="M193 447 m-20 0 a20 4 0 1 0 40 0 a14 2.8 0 1 0 -28 0 a8 1.6 0 1 0 16 0" fill="none" stroke="#EFE4CC" stroke-width="1.8" opacity="0.85"/></g>
    <rect x="244" y="512" width="34" height="5" rx="2.5" fill="#C9CDD6" stroke="#1B1F3B" stroke-width="1.5"/><ellipse cx="282" cy="514" rx="6" ry="4" fill="#C9CDD6" stroke="#1B1F3B" stroke-width="1.5"/>
"""),
    before('  <p class="prompt"', "".join(f'  <div aria-hidden="true" style="position: absolute; left: 190px; top: 438px; width: 0; height: 0">{SPL.format(c=c, d=d)}</div>\n'
                                          for c, d in (("#7FC8FF", 3.4), ("#FFF4E0", 5.0)))),
], css="""@keyframes splD{0%{translate:0 0;opacity:0}.3%{opacity:1}5%{translate:var(--dx) var(--dy);opacity:0}100%{opacity:0}}
.spl{animation:splD 10s ease-out infinite both}.sl1{--dx:-24px;--dy:-26px}.sl2{--dx:-8px;--dy:-34px}.sl3{--dx:10px;--dy:-32px}.sl4{--dx:26px;--dy:-22px}.sl5{--dx:0px;--dy:-40px}
@keyframes swirlD{0%,49.9%{opacity:0;transform:rotate(0deg)}52%{opacity:1}96%{opacity:1;transform:rotate(720deg)}100%{opacity:0;transform:rotate(720deg)}}
.swirl{transform-box:fill-box;transform-origin:center;animation:swirlD 10s linear infinite}
@keyframes rainTD{to{background-position:-20px 80px}}.raint{animation:rainTD .8s linear infinite}
""")

# Breathe with Priya: Lab 4 softly behind her (Cabinet B, the HALO poster, the clock at 12:40), drifting bokeh, a calming tint, a fill ring and breathing particles
BOKEH = "".join(f'  <i class="bk det" aria-hidden="true" style="position: absolute; left: {x}px; top: {y}px; width: {r}px; height: {r}px; border-radius: 50%; background: radial-gradient(closest-side, rgba({c}, 0.55), rgba({c}, 0)); animation-delay: {d}s"></i>\n'
                for x, y, r, c, d in ((40, 520, 44, "127, 233, 221", 0), (320, 600, 36, "255, 244, 224", -2), (70, 700, 30, "155, 135, 245", -4), (300, 460, 52, "127, 233, 221", -6),
                                      (180, 760, 40, "255, 244, 224", -1), (20, 380, 34, "155, 135, 245", -3), (350, 340, 28, "127, 233, 221", -5), (230, 640, 26, "255, 244, 224", -7)))
DOTS = "".join(f'<i style="position: absolute; left: {100 + 80 * c - 4:.1f}px; top: {100 + 80 * s - 4:.1f}px; width: 8px; height: 8px; border-radius: 50%; background: #FFF4E0; box-shadow: 0 0 8px #7FE9DD"></i>'
               for c, s in ((1, 0), (0.707, 0.707), (0, 1), (-0.707, 0.707), (-1, 0), (-0.707, -0.707), (0, -1), (0.707, -0.707)))
edit("MiniBreathe.dc.html", 11, 78.1, (195, 540), "drop", [
    before('  <div class="shock" aria-hidden="true"', """  <div aria-hidden="true" style="position: absolute; left: -10px; top: 116px; width: 92px; height: 280px; box-sizing: border-box; border-radius: 8px; background: #2B3352; border: 3px solid #1b1f3b; opacity: 0.7"></div>
  <div aria-hidden="true" style="position: absolute; left: 22px; top: 136px; width: 30px; height: 30px; box-sizing: border-box; border-radius: 6px; background: #F2EFE6; border: 2px solid #1b1f3b; opacity: 0.6; display: grid; place-items: center; font: 900 18px/1 'Nunito', sans-serif; color: #1b1f3b">B</div>
  <div aria-hidden="true" style="position: absolute; left: 100px; top: 126px; width: 44px; height: 58px; box-sizing: border-box; background: #EAD9B4; border: 2px solid #1b1f3b; opacity: 0.35"></div>
  <svg viewBox="0 0 44 58" aria-hidden="true" style="position: absolute; left: 100px; top: 126px; width: 44px; height: 58px; opacity: 0.4"><circle cx="15" cy="28" r="7" fill="none" stroke="#1B1F3B" stroke-width="2.5"/><circle cx="29" cy="28" r="7" fill="none" stroke="#1B1F3B" stroke-width="2.5"/></svg>
  <svg viewBox="0 0 40 40" aria-hidden="true" style="position: absolute; left: 160px; top: 128px; width: 40px; height: 40px; opacity: 0.55"><circle cx="20" cy="20" r="17" fill="#F2EFE6" stroke="#1B1F3B" stroke-width="2.5"/><path d="M20 20 L21.2 10.5 M20 20 L12.5 24.5" stroke="#1B1F3B" stroke-width="2.4" stroke-linecap="round"/></svg>
  <div class="calmtint det" aria-hidden="true" style="position: absolute; inset: 0; background: linear-gradient(rgba(63, 184, 175, 0.0), rgba(63, 184, 175, 0.35))"></div>
""" + BOKEH),
    before('    <div class="breathe" style="position: absolute; inset: 0; border-radius: 50%; border: 3px dashed', """    <svg viewBox="0 0 200 200" style="position: absolute; left: -12px; top: -12px; width: 224px; height: 224px; overflow: visible">
      <circle cx="100" cy="100" r="104" fill="none" stroke="rgba(255, 244, 224, 0.15)" stroke-width="5"/>
      <circle class="fillring det" cx="100" cy="100" r="104" fill="none" stroke="#BFFFF5" stroke-width="5" stroke-linecap="round" stroke-dasharray="654" transform="rotate(-90 100 100)"/>
    </svg>
"""),
    after('box-shadow: 0 0 40px rgba(127, 233, 221, 0.55)"></div>', f"""
    <div class="breathe" style="position: absolute; inset: 0"><div class="orbit det" style="position: absolute; inset: 0">{DOTS}</div></div>
    <div class="calmring det" style="position: absolute; inset: -10px; border-radius: 50%; border: 4px solid #BFFFF5"></div>"""),
], css="""@keyframes bkD{0%{transform:translateY(0);opacity:0}15%{opacity:1}85%{opacity:1}100%{transform:translateY(-120px);opacity:0}}
.bk{animation:bkD 8s linear infinite}
@keyframes tintD{0%,5%{opacity:0}76%,96%{opacity:1}100%{opacity:0}}.calmtint{animation:tintD 11s ease-in-out infinite}
@keyframes fillD{0%,5.45%{stroke-dashoffset:654}18.18%{stroke-dashoffset:0}18.3%,29.09%{stroke-dashoffset:654}41.82%{stroke-dashoffset:0}41.9%,52.73%{stroke-dashoffset:654}65.45%{stroke-dashoffset:0}65.6%,100%{stroke-dashoffset:654}}
.fillring{animation:fillD 11s linear infinite}
@keyframes orbitD{to{transform:rotate(360deg)}}.orbit{animation:orbitD 14s linear infinite}
@keyframes calmRingD{0%,76.3%{transform:scale(.8);opacity:0}76.6%{opacity:.9}84%,100%{transform:scale(1.5);opacity:0}}.calmring{animation:calmRingD 11s ease-out infinite}
""")

# Race Rena: Lab 4's sign and clock, parts on the breadboard, tools on the bench, confetti and a sparkle at the win
CONF = "".join(f'<i class="cf2 cg{k} det" style="position: absolute; width: {w}px; height: {h}px; border-radius: {rad}; background: {c}"></i>'
               for k, (w, h, rad, c) in enumerate(((10, 5, "1px", "#F2B33D"), (10, 5, "1px", "#3FB8AF"), (8, 8, "50%", "#FFF4E0"), (10, 5, "1px", "#9B87F5"),
                                                   (10, 5, "1px", "#EF5B5B"), (8, 8, "50%", "#F2B33D"), (10, 5, "1px", "#3FB8AF"), (10, 5, "1px", "#FFF4E0")), 1))
edit("MiniRace.dc.html", 10, 57.9, (267, 392), "drop", [
    before('  <div style="position: absolute; left: 22px; top: 126px; width: 346px; height: 76px;', """  <div aria-hidden="true" style="position: absolute; left: 286px; top: 214px; width: 84px; height: 30px; box-sizing: border-box; border-radius: 6px; background: #2C3266; border: 2.5px solid #1b1f3b; display: grid; place-items: center; font: 900 15px/1 'Nunito', sans-serif; color: #fff4e0; letter-spacing: 3px">LAB 4</div>
  <svg viewBox="0 0 40 40" aria-hidden="true" style="position: absolute; left: 22px; top: 208px; width: 40px; height: 40px"><circle cx="20" cy="20" r="17" fill="#F2EFE6" stroke="#1B1F3B" stroke-width="3"/><path d="M20 20 L21.2 10.5 M20 20 L12.5 24.5" stroke="#1B1F3B" stroke-width="2.6" stroke-linecap="round"/></svg>
  <svg viewBox="0 0 390 90" aria-hidden="true" style="position: absolute; left: 0; top: 612px; width: 390px; height: 90px">
    <g stroke="#1B1F3B" stroke-width="2.5" stroke-linejoin="round">
      <circle cx="44" cy="40" r="20" fill="#C9CDD6"/><circle cx="44" cy="40" r="8" fill="#1B1F3B"/><path d="M62 46 Q80 52 92 44" fill="none" stroke="#9AA3B8"/>
      <rect x="104" y="18" width="46" height="58" rx="8" fill="#F2B33D"/><rect x="112" y="26" width="30" height="16" rx="3" fill="#2A3A30"/><circle cx="127" cy="58" r="9" fill="#1B1F3B"/><path d="M127 58 L132 52" stroke="#F2EFE6" stroke-width="2"/>
      <path d="M186 30 L218 56 M196 26 L226 52" stroke="#3A3E4A" stroke-width="5" stroke-linecap="round"/><circle cx="182" cy="26" r="6" fill="#EF5B5B"/><circle cx="192" cy="22" r="6" fill="#EF5B5B"/>
    </g>
    <text x="127" y="39" text-anchor="middle" font-family="Nunito, sans-serif" font-weight="900" font-size="10" fill="#7DFFB0">9.0</text>
  </svg>
"""),
    before('    <g stroke="#1B1F3B" stroke-width="3">\n      <rect x="32" y="378"', """    <g stroke="#1B1F3B" stroke-width="2">
      <path d="M44 352 H52 M88 352 H96" stroke="#9AA3B8" stroke-width="2.5"/><rect x="52" y="346" width="36" height="12" rx="5" fill="#EAD9B4"/>
      <rect x="60" y="346" width="4" height="12" fill="#B8302F" stroke="none"/><rect x="68" y="346" width="4" height="12" fill="#3F6FA0" stroke="none"/><rect x="76" y="346" width="4" height="12" fill="#F2B33D" stroke="none"/>
      <rect x="54" y="468" width="64" height="26" rx="3" fill="#1B1F3B"/><path d="M62 468 v-6 M74 468 v-6 M86 468 v-6 M98 468 v-6 M110 468 v-6 M62 494 v6 M74 494 v6 M86 494 v6 M98 494 v6 M110 494 v6" stroke="#9AA3B8" stroke-width="2.5"/><circle cx="62" cy="481" r="3" fill="#59617D" stroke="none"/>
      <rect x="188" y="372" width="18" height="26" rx="6" fill="#3F6FA0"/><path d="M193 398 v10 M201 398 v10" stroke="#9AA3B8" stroke-width="2.5"/><rect x="188" y="376" width="18" height="4" fill="#BFE3FF" stroke="none"/>
      <path d="M188 452 Q200 432 212 452" fill="none" stroke="#F2B33D" stroke-width="4"/><path d="M244 470 Q262 448 280 470" fill="none" stroke="#9B87F5" stroke-width="4"/>
      <path d="M50 528 Q98 508 148 528" fill="none" stroke="#3DD68C" stroke-width="4"/>
      <path d="M240 500 H248 M276 500 H284" stroke="#9AA3B8" stroke-width="2.5"/><rect x="248" y="494" width="28" height="12" rx="5" fill="#EAD9B4"/><rect x="254" y="494" width="4" height="12" fill="#3DD68C" stroke="none"/><rect x="262" y="494" width="4" height="12" fill="#1B1F3B" stroke="none"/>
    </g>
"""),
    before('  <div class="touch" aria-hidden="true"', f"""  <div aria-hidden="true" style="position: absolute; left: 267px; top: 392px; width: 0; height: 0">{CONF}</div>
  <svg class="lspk det" viewBox="-10 -10 20 20" aria-hidden="true" style="position: absolute; left: 280px; top: 356px; width: 24px; height: 24px"><path d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z" fill="#FFF4E0"/></svg>
"""),
], css="""@keyframes cf2D{0%,39.9%{translate:0 0;rotate:0deg;opacity:0}40.5%{opacity:1}52%{translate:var(--dx) var(--dy);rotate:var(--r);opacity:1}55%,100%{translate:var(--dx) var(--dy);rotate:var(--r);opacity:0}}
.cf2{animation:cf2D 10s cubic-bezier(.1,.7,.3,1) infinite}
.cg1{--dx:-60px;--dy:-56px;--r:220deg}.cg2{--dx:-20px;--dy:-80px;--r:-180deg}.cg3{--dx:30px;--dy:-74px;--r:300deg}.cg4{--dx:58px;--dy:-30px;--r:-240deg}
.cg5{--dx:-76px;--dy:10px;--r:160deg}.cg6{--dx:62px;--dy:26px;--r:-200deg}.cg7{--dx:-40px;--dy:52px;--r:260deg}.cg8{--dx:24px;--dy:60px;--r:-120deg}
@keyframes lspkD{0%,39.9%{transform:scale(0) rotate(0deg);opacity:0}42%{transform:scale(1.3) rotate(25deg);opacity:1}50%,100%{transform:scale(0) rotate(60deg);opacity:0}}
.lspk{transform-box:fill-box;transform-origin:center;animation:lspkD 10s ease-out infinite}
""")
