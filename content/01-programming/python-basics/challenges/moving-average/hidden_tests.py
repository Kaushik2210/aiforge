import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
moving_average = mod.moving_average


def test_floats_and_negatives():
    out = moving_average([0.5, -1.5, 2.0, 4.0], 2)
    assert [round(v, 9) for v in out] == [-0.5, 0.25, 3.0]


def test_accepts_a_tuple():
    assert moving_average((2, 4, 6), 2) == [3.0, 5.0]


def test_long_input_count():
    assert len(moving_average(list(range(100)), 10)) == 91


def test_every_window_is_the_right_slice():
    assert moving_average([1, 10, 100, 1000], 3) == [37.0, 370.0]


def test_result_is_a_new_list():
    data = [1, 2, 3]
    out = moving_average(data, 1)
    out[0] = 99
    assert data == [1, 2, 3]


def test_unsorted_input_keeps_its_order():
    assert moving_average([9, 1, 5], 2) == [5.0, 3.0]


def test_averages_are_not_rounded():
    out = moving_average([1, 2, 2], 3)
    assert abs(out[0] - 5 / 3) < 1e-12


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
