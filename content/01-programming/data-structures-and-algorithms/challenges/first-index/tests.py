import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
first_index = mod.first_index

class Counted:
    """A big sorted sequence that is computed on demand, and counts every item read."""

    def __init__(self, n, value):
        self.n = n
        self.value = value
        self.reads = 0

    def __len__(self):
        return self.n

    def __getitem__(self, i):
        if isinstance(i, slice):
            raise AssertionError("slicing copies the sequence: index single items instead")
        if i < 0:
            i += self.n
        if not 0 <= i < self.n:
            raise IndexError(i)
        self.reads += 1
        return self.value(i)


def test_finds_a_value_in_the_middle():
    assert first_index([1, 3, 5, 7, 9], 5) == 2


def test_returns_the_first_of_several_equal_items():
    assert first_index([1, 2, 2, 2, 3], 2) == 1
    assert first_index([4, 4, 4, 4], 4) == 0


def test_first_and_last_items_can_be_found():
    data = [10, 20, 30, 40]
    assert first_index(data, 10) == 0
    assert first_index(data, 40) == 3


def test_a_missing_value_gives_minus_one():
    data = [1, 3, 5]
    assert first_index(data, 0) == -1
    assert first_index(data, 4) == -1
    assert first_index(data, 6) == -1


def test_empty_and_single_item_sequences():
    assert first_index([], 1) == -1
    assert first_index([7], 7) == 0
    assert first_index([7], 8) == -1


def test_negative_numbers():
    assert first_index([-9, -4, -4, 0, 3], -4) == 1


def test_it_does_not_scan_a_million_items():
    big = Counted(1_000_000, lambda i: i * 2)  # 0, 2, 4, ...
    assert first_index(big, 123_456) == 61_728
    assert big.reads <= 60, f"read {big.reads} items; a binary search needs about 20"


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
