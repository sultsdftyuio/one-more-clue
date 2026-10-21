"""Path builders and boolean path operations."""
import skia


def rect(l, t, r, b) -> skia.Rect:
    return skia.Rect.MakeLTRB(l, t, r, b)


def rrect(l, t, r, b, rad) -> skia.Path:
    p = skia.Path()
    p.addRRect(skia.RRect.MakeRectXY(rect(l, t, r, b), rad, rad))
    return p


def box(l, t, r, b) -> skia.Path:
    p = skia.Path()
    p.addRect(rect(l, t, r, b))
    return p


def oval(cx, cy, rx, ry=None) -> skia.Path:
    ry = rx if ry is None else ry
    p = skia.Path()
    p.addOval(rect(cx - rx, cy - ry, cx + rx, cy + ry))
    return p


def poly(points, radius=0.0) -> skia.Path:
    """Closed polygon; radius > 0 rounds every corner."""
    p = skia.Path()
    if radius <= 0:
        p.moveTo(*points[0])
        for pt in points[1:]:
            p.lineTo(*pt)
    else:
        (x0, y0), (x1, y1) = points[-1], points[0]
        p.moveTo((x0 + x1) / 2, (y0 + y1) / 2)
        for i, (x, y) in enumerate(points):
            nx, ny = points[(i + 1) % len(points)]
            p.arcTo(x, y, nx, ny, radius)
    p.close()
    return p


def sparkle_path(cx, cy, r, pinch=0.16) -> skia.Path:
    q = r * pinch
    p = skia.Path()
    p.moveTo(cx, cy - r)
    p.quadTo(cx + q, cy - q, cx + r, cy)
    p.quadTo(cx + q, cy + q, cx, cy + r)
    p.quadTo(cx - q, cy + q, cx - r, cy)
    p.quadTo(cx - q, cy - q, cx, cy - r)
    p.close()
    return p


def union(*paths) -> skia.Path:
    out = paths[0]
    for p in paths[1:]:
        out = skia.Op(out, p, skia.PathOp.kUnion_PathOp)
    return out


def minus(a, b) -> skia.Path:
    return skia.Op(a, b, skia.PathOp.kDifference_PathOp)


def intersect(a, b) -> skia.Path:
    return skia.Op(a, b, skia.PathOp.kIntersect_PathOp)


def moved(path, dx, dy) -> skia.Path:
    p = skia.Path(path)
    p.offset(dx, dy)
    return p
