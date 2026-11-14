class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


class Limiter:
    """Let at most `limit` tasks be inside `async with limiter:` at once.

        limiter = Limiter(2)

        async def job():
            async with limiter:       # waits here if two tasks are already inside
                ...                   # at most two tasks are ever in this block
                await Pause()

    - `limit` must be at least 1, otherwise raise ValueError.
    - `limiter.active` is the number of tasks currently inside the block.
    - A task that has to wait should `await Pause()` and check again, so other
      tasks get a turn while it waits.
    - A task must give its place back when it leaves the block, whether it
      finished normally or raised an exception. The exception must still reach
      the caller: do not hide it.
    - Each Limiter has its own count.
    """

    def __init__(self, limit):
        # TODO: check the limit, then set up the count
        raise NotImplementedError("implement Limiter")

    # TODO: async def __aenter__(self) and async def __aexit__(self, exc_type, exc, tb)
