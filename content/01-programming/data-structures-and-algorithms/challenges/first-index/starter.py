def first_index(items, target):
    """Return the index of the FIRST item equal to `target`, or -1 if there is none.

    `items` is sorted from smallest to largest and may contain repeats. It can
    be a plain list or any sequence that supports len() and indexing, and it
    may be huge, so do not scan it from the start.

    first_index([1, 2, 2, 2, 3], 2) -> 1
    first_index([1, 2, 3], 5)       -> -1
    first_index([], 1)              -> -1

    The tests count how many items you read. Reading about log2(n) items is
    expected; reading them all will fail.
    """
    # TODO: keep a range [lo, hi) that must contain the answer, and halve it each step
    raise NotImplementedError("implement first_index")
