# Wrong: restarts the position on the object each time, so a loop inside a loop resets the outer one.
class Countdown:
    def __init__(self, start):
        self.start = start
        self.n = start

    def __iter__(self):
        self.n = self.start
        return self

    def __next__(self):
        if self.n <= 0:
            raise StopIteration
        value = self.n
        self.n -= 1
        return value
