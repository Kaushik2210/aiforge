import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
word_frequencies = mod.word_frequencies


def test_counts_and_order():
    assert word_frequencies("the cat saw the dog") == [("the", 2), ("cat", 1), ("dog", 1), ("saw", 1)]


def test_ignores_case():
    assert word_frequencies("Go go GO") == [("go", 3)]


def test_strips_punctuation_at_the_ends():
    assert word_frequencies("Hello, world! Hello?") == [("hello", 2), ("world", 1)]


def test_ties_are_alphabetical_not_first_seen():
    # "zebra" appears first but must come after "apple" because the counts tie.
    assert word_frequencies("zebra apple") == [("apple", 1), ("zebra", 1)]


def test_empty_text_gives_empty_list():
    assert word_frequencies("") == []
    assert word_frequencies("   \n  ") == []


def test_returns_a_list_of_tuples():
    result = word_frequencies("a b a")
    assert isinstance(result, list)
    assert all(isinstance(item, tuple) and len(item) == 2 for item in result)


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001 - report any failure kind
                failures += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failures else 0)
