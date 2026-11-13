# Wrong: a plain generator, so a bad size only raises when the first chunk is requested.
from itertools import islice


def chunked(iterable, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    items = iter(iterable)
    while True:
        chunk = list(islice(items, size))
        if not chunk:
            return
        yield chunk
