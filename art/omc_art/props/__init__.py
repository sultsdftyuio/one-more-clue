"""Clue props. Each module exposes draw(canvas) on a 400 x 400 frame."""
from . import clock, fingerprint, folder, keycard, magnifier, markers, phone, polaroid

PROPS = {
    "magnifier": magnifier.draw,
    "phone": phone.draw,
    "folder": folder.draw,
    "clock": clock.draw,
    "keycard": keycard.draw,
    "polaroid": polaroid.draw,
    "fingerprint": fingerprint.draw,
    "pushpin": markers.pushpin,
    "question": markers.question,
    "sparkle": markers.sparkle,
}
