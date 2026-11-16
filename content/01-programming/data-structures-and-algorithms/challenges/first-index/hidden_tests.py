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


def test_many_repeats_in_a_huge_sequence():
    big = Counted(900_000, lambda i: i // 3)  # each value appears three times
    assert first_index(big, 1000) == 3000
    assert big.reads <= 60


def test_a_missing_value_in_a_huge_sequence_is_found_missing_quickly():
    big = Counted(1_000_000, lambda i: i * 2)
    assert first_index(big, 7) == -1
    assert big.reads <= 60


def test_the_first_and_last_of_a_huge_sequence():
    big = Counted(1_000_000, lambda i: i)
    assert first_index(big, 0) == 0
    assert first_index(big, 999_999) == 999_999
    assert big.reads <= 120


def test_every_position_in_a_small_list_with_repeats():
    data = [1, 1, 2, 2, 2, 3, 5, 5, 8]
    for target in range(0, 10):
        expected = data.index(target) if target in data else -1
        assert first_index(data, target) == expected


def test_all_items_equal():
    assert first_index([6] * 50, 6) == 0
    assert first_index([6] * 50, 5) == -1
    assert first_index([6] * 50, 7) == -1


def test_the_sequence_is_not_changed():
    data = [1, 2, 2, 3]
    first_index(data, 2)
    assert data == [1, 2, 2, 3]


def test_works_with_strings():
    assert first_index(["ant", "bee", "bee", "cat"], "bee") == 1
    assert first_index(["ant", "bee", "cat"], "dog") == -1


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
