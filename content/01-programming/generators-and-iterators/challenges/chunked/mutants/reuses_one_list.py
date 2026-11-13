# Wrong: yields the same list object every time and clears it.
def chunked(iterable, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return _chunks(iter(iterable), size)


def _chunks(items, size):
    chunk = []
    for item in items:
        chunk.append(item)
        if len(chunk) == size:
            yield chunk
            chunk = chunk  # forgets to start a new list
            chunk.clear()
    if chunk:
        yield chunk
