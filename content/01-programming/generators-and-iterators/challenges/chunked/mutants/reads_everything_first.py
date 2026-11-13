# Wrong: copies the whole input into a list before yielding, so it is not lazy.
def chunked(iterable, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return _chunks(list(iterable), size)


def _chunks(items, size):
    for i in range(0, len(items), size):
        yield items[i:i + size]
