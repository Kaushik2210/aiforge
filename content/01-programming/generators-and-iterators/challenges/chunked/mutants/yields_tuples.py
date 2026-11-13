# Wrong: tuples instead of lists.
from itertools import islice


def chunked(iterable, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return _chunks(iter(iterable), size)


def _chunks(items, size):
    while True:
        chunk = tuple(islice(items, size))
        if not chunk:
            return
        yield chunk
