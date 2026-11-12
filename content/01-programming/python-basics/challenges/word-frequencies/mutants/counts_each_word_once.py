# Wrong: every count is 1.
def word_frequencies(text):
    counts = {}
    for raw in text.split():
        word = raw.strip(".,!?;:\"'()").lower()
        if word:
            counts[word] = counts.get(word, 0) + 1
    return sorted(((w, 1) for w in counts), key=lambda item: item[0])
