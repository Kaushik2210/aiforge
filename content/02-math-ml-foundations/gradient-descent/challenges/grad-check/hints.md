1. Loop over coordinates. For coordinate `i`, build two copies of `x`: one with `h` added at `i`, one with `h` subtracted.
2. The estimate for that coordinate is `(f(plus) - f(minus)) / (2 * h)`. Copy the list first so you never modify the caller's `x`.
3. For `relative_error`, compute `abs(p - q) / max(abs(p), abs(q), 1e-12)` per pair and return the largest value.
