def make_counter(start=0, step=1):
    """Return a function that counts.

    counter = make_counter(10, 5)
    counter()  -> 10
    counter()  -> 15
    counter()  -> 20

    - The first call returns `start`; each later call returns the previous
      value plus `step`.
    - The returned function takes no arguments.
    - Every counter has its own count: two counters never affect each other.
    """
    # TODO: create the state here, and return an inner function that updates it
    raise NotImplementedError("implement make_counter")
