class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


def run_all(coroutines):
    """Run coroutines by taking turns, and return their results in the order given.

    `coroutines` are coroutine objects (what you get by calling an `async def`
    function). They are not started yet.

    - A "step" runs a coroutine until it awaits Pause() or finishes.
    - Each round, give every unfinished coroutine one step, in the order they
      were given. Stop when all are finished.
    - Return a list of the values the coroutines returned, in the order the
      coroutines were given (not the order they finished).
    - An empty list gives an empty list.
    - If a coroutine raises an exception, let it propagate out of run_all.

    A coroutine is driven with coro.send(None). When it finishes, send raises
    StopIteration, and the value it returned is on that exception's .value.
    """
    # TODO: loop over the unfinished coroutines, one step each, until all are done
    raise NotImplementedError("implement run_all")
