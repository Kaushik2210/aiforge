1. Keep only the starting number on the object. Anything that changes while you loop, such as the current number, must not live there.
2. Define `__iter__` so that every call makes a brand new iterator. A generator method does exactly that: each call to `__iter__` runs the body from the top with its own local variables.
3. If `__iter__` returns `self` and the object also has `__next__`, the object is a one-shot iterator: after one loop it is used up, and two loops over it share one position.
