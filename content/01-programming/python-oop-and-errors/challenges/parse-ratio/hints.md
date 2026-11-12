1. `text.split("/")` gives a list of the parts; unpacking it into exactly two names already raises `ValueError` when there are too few or too many.
2. `int(part)` raises `ValueError` for text that is not a whole number, which is the error you want, so you do not need to catch it. Check for a zero denominator yourself and raise `ValueError` with a message.
3. Do not wrap the whole function in `try`/`except Exception`. Catching everything would also turn `None` into a ValueError, which hides a real bug in the caller.
