def make_counter(start=0, step=1):
    value = start
    started = False

    def counter():
        nonlocal value, started
        if started:
            value += step
        started = True
        return value

    return counter
