# Wrong: peeks at the next item before yielding a chunk, so it reads past what the chunk needs.
def chunked(iterable, size):
    if size < 1:
        raise ValueError("size must be at least 1")
    return _chunks(iter(iterable), size)


def _chunks(items, size):
    chunk = []
    for item in items:
        chunk.append(item)
        if len(chunk) == size + 1:
            yield chunk[:size]
            chunk = chunk[size:]
    while chunk:
        yield chunk[:size]
        chunk = chunk[size:]
