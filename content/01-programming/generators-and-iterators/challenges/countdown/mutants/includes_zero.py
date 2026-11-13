# Wrong: counts down to 0 as well.
class Countdown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        n = self.start
        while n >= 0:
            yield n
            n -= 1
