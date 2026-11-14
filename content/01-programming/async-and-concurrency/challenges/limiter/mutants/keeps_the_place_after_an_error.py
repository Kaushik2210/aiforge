# Wrong: only gives the place back when the block did not fail.
class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


class Limiter:
    def __init__(self, limit):
        if limit < 1:
            raise ValueError("limit must be at least 1")
        self.limit = limit
        self.active = 0

    async def __aenter__(self):
        while self.active >= self.limit:
            await Pause()
        self.active += 1
        return self

    async def __aexit__(self, exc_type, exc, tb):
        if exc_type is None:
            self.active -= 1
        return False
