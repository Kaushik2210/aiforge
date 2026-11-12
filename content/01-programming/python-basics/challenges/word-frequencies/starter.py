def word_frequencies(text):
    """Count how often each word appears in `text`.

    - Words are separated by whitespace.
    - Ignore case: "The" and "the" are the same word. Return words in lowercase.
    - Strip these characters from both ends of a word: . , ! ? ; : " ' ( )
      Characters inside a word stay, so "don't" is one word.
    - Skip a token that is empty after stripping.

    Return a list of (word, count) tuples, most frequent first. Words with the
    same count go in alphabetical order.
    """
    # TODO: count the words, then sort them
    raise NotImplementedError("implement word_frequencies")
