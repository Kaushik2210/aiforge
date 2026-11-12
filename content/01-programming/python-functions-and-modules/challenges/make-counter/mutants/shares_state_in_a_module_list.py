# Wrong: the state lives in one module-level list, so a counter made later continues from the old count.
_state = [None]


def make_counter(start=0, step=1):
    if _state[0] is None:
        _state[0] = start - step

    def counter():
        _state[0] += step
        return _state[0]

    return counter
