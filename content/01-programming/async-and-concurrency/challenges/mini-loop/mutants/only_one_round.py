class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


# Wrong: gives every task a single step and stops, leaving unfinished tasks behind.
def run_all(coroutines):
    tasks = list(coroutines)
    results = [None] * len(tasks)
    for i, coro in enumerate(tasks):
        try:
            coro.send(None)
        except StopIteration as done:
            results[i] = done.value
    return results
