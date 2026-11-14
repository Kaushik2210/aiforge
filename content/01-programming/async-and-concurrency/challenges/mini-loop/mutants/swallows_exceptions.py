class Pause:
    """`await Pause()` hands control back to the loop so other tasks get a turn.

    It is the smallest possible "await point": a coroutine that awaits it
    stops running until the loop calls send(None) on it again.
    """

    def __await__(self):
        yield


# Wrong: hides a failing task and carries on.
def run_all(coroutines):
    tasks = list(coroutines)
    results = [None] * len(tasks)
    pending = list(range(len(tasks)))
    while pending:
        still_going = []
        for i in pending:
            try:
                tasks[i].send(None)
            except StopIteration as done:
                results[i] = done.value
            except Exception:
                pass
            else:
                still_going.append(i)
        pending = still_going
    return results
