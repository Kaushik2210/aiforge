def chunked(iterable, size):
    """Yield lists of up to `size` items taken from `iterable`, in order.

    list(chunked([1, 2, 3, 4, 5, 6, 7], 3)) -> [[1, 2, 3], [4, 5, 6], [7]]

    - The last chunk may be shorter. An empty iterable gives no chunks.
    - Each chunk is a new list.
    - Be lazy: take only as many items from `iterable` as the chunk you are
      about to return needs. It may be a stream too big to hold in memory.
    - If size is less than 1, raise ValueError as soon as chunked() is CALLED,
      before anyone asks for a chunk.
    """
    # TODO: check the size first, then hand back something that yields the chunks
    raise NotImplementedError("implement chunked")
