# Wrong: stores start - step so the first call lands on start, which is inexact for floats and fails for non-numbers.
def make_counter(start=0, step=1):
    value = start - step

    def counter():
        nonlocal value
        value += step
        return value

    return counter
