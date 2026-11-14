1. `coro.send(None)` runs a coroutine up to its next `await Pause()` and then returns. When the coroutine is finished, `send` raises `StopIteration` instead, and the returned value is `error.value`.
2. Keep a list of the tasks that are still going. Each round, give each of them one `send(None)`; any that raised `StopIteration` are done (store their value), the rest go into next round's list.
3. Store each result by the task's position in the input list, so the answer comes back in the order the coroutines were given. Let any other exception simply pass through.
