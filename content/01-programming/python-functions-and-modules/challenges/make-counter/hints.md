1. The count has to live somewhere that survives between calls. A variable in the outer function does, as long as the inner function can reach it.
2. An inner function can read an outer variable, but assigning to it creates a new local one unless you declare `nonlocal` first.
3. The first call must return `start` exactly, with no arithmetic on it. Remember whether the counter has been called yet, and only add `step` from the second call on.
