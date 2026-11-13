# Wrong: never yields 1.
class Countdown:
    def __init__(self, start):
        self.start = start

    def __iter__(self):
        n = self.start
        while n > 1:
            yield n
            n -= 1
