# Wrong: only yields full chunks.
from itertools import islice


def chunked(iterable, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return _chunks(iter(iterable), size)


def _chunks(items, size):
    while True:
        chunk = list(islice(items, size))
        if len(chunk) < size:
            return
        yield chunk
