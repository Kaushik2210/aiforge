1. `itertools.islice(items, size)` takes up to `size` items and stops, and `list(...)` of it is one chunk. Calling it again on the same iterator carries on where it stopped, so make an iterator once with `iter(iterable)`.
2. A function that contains `yield` is a generator function: calling it runs none of its body, so a `ValueError` raised inside only appears on the first `next`. To fail at the call, check the size in a normal function and return the generator.
3. Stop when a chunk comes back empty. That also handles an empty input and an input that is an exact multiple of `size`.
