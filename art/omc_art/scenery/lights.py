"""Whether the city's lights are on. The blackout layers are drawn with them off.

Lights off only changes what gets painted, never the random rolls, so a dark
layer lines up with its lit twin window for window.
"""
from contextlib import contextmanager

_state = {"on": True}


def lights_on():
    return _state["on"]


@contextmanager
def lights_off():
    _state["on"] = False
    try:
        yield
    finally:
        _state["on"] = True
