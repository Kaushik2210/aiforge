# Wrong: the count lives on the class, so separate limiters share it.
class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


class Limiter:
    active = 0

    def __init__(self, limit):
        if limit < 1:
            raise ValueError("limit must be at least 1")
        self.limit = limit

    async def __aenter__(self):
        while Limiter.active >= self.limit:
            await Pause()
        Limiter.active += 1
        return self

    async def __aexit__(self, exc_type, exc, tb):
        Limiter.active -= 1
        return False
