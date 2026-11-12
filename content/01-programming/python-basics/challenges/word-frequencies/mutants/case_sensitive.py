# Wrong: forgets to lowercase, so "The" and "the" are different words.
def word_frequencies(text):
    counts = {}
    for raw in text.split():
        word = raw.strip(".,!?;:\"'()")
        if word:
            counts[word] = counts.get(word, 0) + 1
    return sorted(counts.items(), key=lambda item: (-item[1], item[0]))
