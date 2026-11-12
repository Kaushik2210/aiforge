import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
moving_average = mod.moving_average


def test_basic_windows():
    assert moving_average([1, 2, 3, 4, 5], 2) == [1.5, 2.5, 3.5, 4.5]


def test_window_of_three():
    assert moving_average([2, 4, 6, 8, 10], 3) == [4.0, 6.0, 8.0]


def test_window_of_one_returns_the_values():
    assert moving_average([3, 1, 2], 1) == [3.0, 1.0, 2.0]


def test_window_as_long_as_the_list_gives_one_value():
    assert moving_average([1, 2, 3, 4], 4) == [2.5]


def test_window_longer_than_the_list_gives_nothing():
    assert moving_average([1, 2], 5) == []
    assert moving_average([], 1) == []


def test_bad_window_raises_value_error():
    for bad in (0, -1):
        try:
            moving_average([1, 2, 3], bad)
        except ValueError:
            continue
        raise AssertionError(f"window={bad} should raise ValueError")


def test_does_not_change_the_input():
    data = [5, 3, 8, 1]
    moving_average(data, 2)
    assert data == [5, 3, 8, 1]


def test_uses_true_division():
    assert moving_average([1, 2], 2) == [1.5]


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
