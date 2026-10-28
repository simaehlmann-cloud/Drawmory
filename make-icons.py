#!/usr/bin/env python3
"""Erzeugt alle App-Icons und den Startbildschirm für Drawmory.

    python3 make-icons.py

Motiv: Haus in blauer Tinte, darüber eine nachgezeichnete Kopie in Magenta,
auf Rechenkästchen-Papier. iOS-Icons ohne Alphakanal (App Store Connect
lehnt Transparenz ab).

Android: klassische Icons je Dichte und adaptive Icons (Vordergrund mit
transparentem Grund, Hintergrundfarbe aus res/android/colors.xml), wie bei
FairMix. Der iOS-Workflow ruft dieses Skript vor jedem Build auf."""
import os
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
PAPER = (245, 248, 252)
GRID = (214, 225, 240)
INK = (42, 59, 183)
PEN = (217, 42, 110)

def art(size, pad=0.0, transparent=False):
    """Motiv auf quadratischer Fläche; pad = Rand für maskierbare Icons.
    transparent: ohne Papier und Raster (Vordergrund adaptiver Icons)."""
    S = 4                      # Supersampling
    W = size * S
    im = Image.new("RGBA" if transparent else "RGB", (W, W), (0, 0, 0, 0) if transparent else PAPER)
    d = ImageDraw.Draw(im)
    inner = W * (1 - 2 * pad)
    off = W * pad
    def P(x, y):               # Koordinaten im Raum 0..96
        return (off + x / 96 * inner, off + y / 96 * inner)
    if size >= 64 and not transparent:
        cell = inner / 12
        gw = max(1, int(W / 300))
        n = int(W / cell) + 2
        start = off % cell
        for i in range(-1, n):
            v = start + i * cell
            d.line([(v, 0), (v, W)], fill=GRID, width=gw)
            d.line([(0, v), (W, v)], fill=GRID, width=gw)
    lw = int(inner * 0.062)
    def stroke(pts, color, width):
        """Linienzug mit runden Ecken und Enden"""
        q = [P(*p) for p in pts]
        for a, b in zip(q, q[1:]):
            d.line([a, b], fill=color, width=width)
        r = width / 2
        for x, y in q:
            d.ellipse([x - r, y - r, x + r, y + r], fill=color)
    stroke([(22, 78), (22, 42), (48, 18), (74, 42), (74, 78), (22, 78)], INK, lw)
    stroke([(22, 42), (74, 42)], INK, lw)
    stroke([(27, 82), (26.5, 47), (52, 24.5), (78.5, 46), (78, 82.5), (27, 82)], PEN, int(lw * 0.8))
    return im.resize((size, size), Image.LANCZOS)

def save(im, *parts):
    path = os.path.join(HERE, *parts)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)

save(art(1024, 0.04), "icon-1024.png")
save(art(512, 0.04), "icon.png")
save(art(192, 0.04), "icon-192.png")
save(art(180, 0.04), "icon-180.png")
save(art(512, 0.16), "icon-maskable-512.png")
for s in (20, 29, 40, 58, 60, 76, 80, 87, 120, 152, 167, 180, 1024):
    save(art(s, 0.04), "res", "ios", f"icon-{s}.png")

# Startbildschirm: Motiv mittig auf Papier, quadratisch für alle Geräte
splash = Image.new("RGB", (2732, 2732), PAPER)
motif = art(700, 0.0)
splash.paste(motif, ((2732 - 700) // 2, (2732 - 700) // 2))
save(splash, "res", "ios", "Default@2x~universal~anyany.png")
# Android: klassisch (48 dp) und adaptiver Vordergrund (108 dp, Motiv in der
# sicheren Zone von 66 dp, also rund 19 % Rand je Seite)
DICHTEN = {"ldpi": 0.75, "mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}
for name, f in DICHTEN.items():
    save(art(round(48 * f), 0.04), "res", "android", f"icon_{name}.png")
    save(art(round(108 * f), 0.2, transparent=True), "res", "android", f"icon_fg_{name}.png")
farben = os.path.join(HERE, "res", "android", "colors.xml")
with open(farben, "w", encoding="utf-8") as fh:
    fh.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
             '    <color name="drawmory_icon_background">#F5F8FC</color>\n</resources>\n')
print("Icons erzeugt")
