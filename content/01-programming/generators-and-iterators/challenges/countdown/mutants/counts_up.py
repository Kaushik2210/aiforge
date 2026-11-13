# Wrong: the wrong direction.
class Countdown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        for n in range(1, self.start + 1):
            yield n
