# Wrong: always counts by 1.
def make_counter(start=0, step=1):
    value = start - 1

    def counter():
        nonlocal value
        value += 1
        return value

    return counter
