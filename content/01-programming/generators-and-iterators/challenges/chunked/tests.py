import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
chunked = mod.chunked


def test_basic_chunks_with_a_short_last_one():
    assert list(chunked([1, 2, 3, 4, 5, 6, 7], 3)) == [[1, 2, 3], [4, 5, 6], [7]]


def test_exact_multiple():
    assert list(chunked(range(6), 2)) == [[0, 1], [2, 3], [4, 5]]


def test_empty_input_gives_no_chunks():
    assert list(chunked([], 3)) == []


def test_size_larger_than_the_data():
    assert list(chunked("ab", 10)) == [["a", "b"]]


def test_chunks_are_lists():
    chunks = list(chunked((1, 2, 3, 4), 2))
    assert all(isinstance(c, list) for c in chunks)


def test_works_on_a_generator_input():
    gen = (n * n for n in range(5))
    assert list(chunked(gen, 2)) == [[0, 1], [4, 9], [16]]


def test_a_bad_size_raises_when_called_not_when_iterated():
    for bad in (0, -1):
        try:
            chunked([1, 2, 3], bad)  # no iteration here
        except ValueError:
            continue
        raise AssertionError(f"chunked(..., {bad}) should raise ValueError right away")


def test_each_call_gives_an_iterator_that_can_be_stepped():
    chunks = chunked([1, 2, 3], 2)
    assert next(chunks) == [1, 2]
    assert next(chunks) == [3]
    try:
        next(chunks)
    except StopIteration:
        return
    raise AssertionError("expected StopIteration after the last chunk")


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
