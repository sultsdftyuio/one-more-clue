"""Case posters (key art for each case) and the Season 1 triptych."""
from . import dead_air, last_course, last_message, snowed_in, triptych

POSTERS = {
    "case-001": last_message.draw,
    "case-002": dead_air.draw,
    "case-003": last_course.draw,
    "case-004": snowed_in.draw,
}

TRIPTYCH = triptych.draw
