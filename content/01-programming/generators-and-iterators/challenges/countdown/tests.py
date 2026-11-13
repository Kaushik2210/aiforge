import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Countdown = mod.Countdown


def test_counts_down_to_one():
    assert list(Countdown(3)) == [3, 2, 1]


def test_a_for_loop_works():
    seen = []
    for n in Countdown(4):
        seen.append(n)
    assert seen == [4, 3, 2, 1]


def test_zero_and_negative_give_nothing():
    assert list(Countdown(0)) == []
    assert list(Countdown(-5)) == []


def test_it_can_be_looped_over_again():
    c = Countdown(3)
    assert list(c) == [3, 2, 1]
    assert list(c) == [3, 2, 1]


def test_two_loops_at_once_do_not_disturb_each_other():
    c = Countdown(2)
    pairs = [(a, b) for a in c for b in c]
    assert pairs == [(2, 2), (2, 1), (1, 2), (1, 1)]


def test_works_with_the_usual_tools():
    c = Countdown(4)
    assert sum(c) == 10
    assert max(c) == 4
    assert 2 in c
    assert sorted(c) == [1, 2, 3, 4]


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
