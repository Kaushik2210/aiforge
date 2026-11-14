class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


# Wrong: runs one task completely before the next, so nothing interleaves.
def run_all(coroutines):
    results = []
    for coro in coroutines:
        while True:
            try:
                coro.send(None)
            except StopIteration as done:
                results.append(done.value)
                break
    return results
