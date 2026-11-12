# Wrong: forgets to update the count.
def make_counter(start=0, step=1):
    value = start

    def counter():
        return value

    return counter
