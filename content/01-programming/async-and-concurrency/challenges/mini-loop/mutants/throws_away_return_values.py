class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


# Wrong: forgets to keep what each task returned.
def run_all(coroutines):
    tasks = list(coroutines)
    pending = list(range(len(tasks)))
    while pending:
        still_going = []
        for i in pending:
            try:
                tasks[i].send(None)
            except StopIteration:
                pass
            else:
                still_going.append(i)
        pending = still_going
    return [None] * len(tasks)
