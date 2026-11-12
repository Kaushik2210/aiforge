1. A default value in a function header is created once, when the function is defined, and reused by every call. A list written as the default would be shared by all calls that rely on it.
2. Use `None` as the default and decide inside the function: when no bucket was given, create a new list there.
3. Test with `bucket is None`, not `if not bucket`: an empty list you were given is falsy but still must be the list you append to.
