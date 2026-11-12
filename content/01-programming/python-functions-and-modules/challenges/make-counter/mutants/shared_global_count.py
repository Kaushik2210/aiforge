# Wrong: one count in the module, so every counter shares it.
_value = None


def make_counter(start=0, step=1):
    global _value
    _value = start - step

    def counter():
        global _value
        _value += step
        return _value

    return counter
