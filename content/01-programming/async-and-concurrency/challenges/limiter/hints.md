1. Keep two numbers on the object: the limit and how many tasks are inside right now (`active`).
2. In `__aenter__`, loop `while self.active >= self.limit: await Pause()`. Only when there is room, add one to `active`. Checking again after every pause matters, because someone else may have taken the place.
3. In `__aexit__`, take one off `active` and return `False` (or nothing), so any exception from the block carries on to the caller. `__aexit__` is called for both a normal exit and an exception, so it is the right place to give the place back.
