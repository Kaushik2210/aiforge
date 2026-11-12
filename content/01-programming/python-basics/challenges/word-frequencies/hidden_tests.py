import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
word_frequencies = mod.word_frequencies


def test_tokens_that_strip_to_nothing_are_skipped():
    assert word_frequencies("... !!! ???") == []
    assert word_frequencies("... ok") == [("ok", 1)]


def test_inner_apostrophe_stays():
    assert word_frequencies("Don't stop, don't.") == [("don't", 2), ("stop", 1)]


def test_any_whitespace_separates_words():
    assert word_frequencies("a\tb\nc  a") == [("a", 2), ("b", 1), ("c", 1)]


def test_quotes_and_parentheses_are_stripped():
    assert word_frequencies('"(yes)" yes') == [("yes", 2)]


def test_higher_count_beats_alphabetical():
    assert word_frequencies("b b b a a c") == [("b", 3), ("a", 2), ("c", 1)]


def test_many_words():
    text = " ".join(["x"] * 500 + ["y"] * 200)
    assert word_frequencies(text) == [("x", 500), ("y", 200)]


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
