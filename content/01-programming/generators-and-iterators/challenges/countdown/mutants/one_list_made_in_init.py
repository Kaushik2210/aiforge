# Wrong: builds one iterator in __init__ and hands the same one out every time.
class Countdown:
    def __init__(self, start):
        self.start = start
        self._it = iter(range(start, 0, -1))

    def __iter__(self):
        return self._it
