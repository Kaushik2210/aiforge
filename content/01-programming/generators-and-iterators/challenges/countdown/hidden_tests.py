import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Countdown = mod.Countdown


def test_a_big_countdown():
    assert sum(Countdown(1000)) == 500500


def test_a_half_used_iterator_does_not_affect_a_new_loop():
    c = Countdown(3)
    it = iter(c)
    assert next(it) == 3
    assert next(it) == 2
    assert list(c) == [3, 2, 1]
    assert next(it) == 1


def test_every_iter_call_starts_again():
    c = Countdown(5)
    assert next(iter(c)) == 5
    assert next(iter(c)) == 5


def test_unpacking_and_zip():
    a, b, c = Countdown(3)
    assert (a, b, c) == (3, 2, 1)
    assert list(zip(Countdown(3), "abc")) == [(3, "a"), (2, "b"), (1, "c")]


def test_an_exhausted_iterator_stays_exhausted_but_the_object_does_not():
    c = Countdown(1)
    it = iter(c)
    assert list(it) == [1]
    assert list(it) == []
    assert list(c) == [1]


def test_separate_countdowns_are_separate():
    a = Countdown(2)
    b = Countdown(3)
    assert list(a) == [2, 1]
    assert list(b) == [3, 2, 1]


def test_iterating_gives_ints_in_order_for_every_start_up_to_twenty():
    for n in range(0, 21):
        assert list(Countdown(n)) == list(range(n, 0, -1))


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
