1. Split the text on whitespace, clean each piece with `strip` and `lower`, and skip it if nothing is left.
2. Keep a dictionary from word to count; `counts.get(word, 0) + 1` adds one without a special case for new words.
3. `sorted(counts.items(), key=...)` sorts by whatever the key returns. A key that returns a tuple `(-count, word)` sorts by count high to low, then alphabetically.
