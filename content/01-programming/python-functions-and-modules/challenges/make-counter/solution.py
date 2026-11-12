def make_counter(start=0, step=1):
    value = start - step

    def counter():
        nonlocal value
        value += step
        return value

    return counter
