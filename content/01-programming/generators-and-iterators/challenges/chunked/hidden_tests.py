import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
chunked = mod.chunked


class Counting:
    """An iterator that counts how many items have been taken from it."""

    def __init__(self, n):
        self.n = n
        self.taken = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.taken >= self.n:
            raise StopIteration
        self.taken += 1
        return self.taken


def test_it_takes_only_what_the_first_chunk_needs():
    src = Counting(1_000_000)
    first = next(chunked(src, 3))
    assert first == [1, 2, 3]
    assert src.taken == 3


def test_it_takes_one_chunk_at_a_time():
    src = Counting(100)
    chunks = chunked(src, 4)
    next(chunks)
    next(chunks)
    assert src.taken == 8


def test_it_does_not_read_ahead_after_the_last_full_chunk():
    src = Counting(6)
    chunks = chunked(src, 3)
    assert next(chunks) == [1, 2, 3]
    assert next(chunks) == [4, 5, 6]
    assert src.taken == 6


def test_calling_chunked_reads_nothing_yet():
    src = Counting(10)
    chunked(src, 2)
    assert src.taken == 0


def test_chunks_do_not_share_one_list():
    chunks = list(chunked(range(6), 3))
    chunks[0].append(99)
    assert chunks[1] == [3, 4, 5]
    assert chunks[0] is not chunks[1]


def test_size_one_and_a_huge_size():
    assert list(chunked("abc", 1)) == [["a"], ["b"], ["c"]]
    assert list(chunked(range(3), 10**9)) == [[0, 1, 2]]


def test_the_result_is_an_iterator():
    chunks = chunked([1, 2, 3, 4], 2)
    assert iter(chunks) is chunks


def test_a_dict_is_chunked_by_its_keys():
    assert list(chunked({"a": 1, "b": 2, "c": 3}, 2)) == [["a", "b"], ["c"]]


def test_a_list_input_can_be_chunked_again_after_a_full_pass():
    data = [1, 2, 3, 4]
    assert list(chunked(data, 2)) == list(chunked(data, 2))


def test_the_size_check_happens_at_the_call_even_for_a_one_item_input():
    for bad in (0, -3):
        raised = False
        try:
            chunked(Counting(1), bad)  # never iterated
        except ValueError:
            raised = True
        assert raised, f"size {bad} should raise ValueError at the call"


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
