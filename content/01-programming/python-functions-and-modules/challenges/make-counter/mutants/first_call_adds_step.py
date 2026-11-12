# Wrong: the first call returns start + step instead of start.
def make_counter(start=0, step=1):
    value = start

    def counter():
        nonlocal value
        value += step
        return value

    return counter
