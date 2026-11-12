import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
make_counter = mod.make_counter


def test_many_calls():
    c = make_counter(7, 3)
    last = None
    for _ in range(1000):
        last = c()
    assert last == 7 + 999 * 3


def test_counters_made_in_a_loop_do_not_share_state():
    counters = [make_counter(i * 100) for i in range(3)]
    assert [c() for c in counters] == [0, 100, 200]
    assert [c() for c in counters] == [1, 101, 201]


def test_zero_step_stays_put():
    c = make_counter(4, 0)
    assert [c(), c(), c()] == [4, 4, 4]


def test_float_step():
    c = make_counter(0, 0.5)
    assert [c(), c(), c()] == [0, 0.5, 1.0]


def test_start_and_step_are_not_changed_by_other_counters():
    a = make_counter(1, 1)
    b = make_counter(1, 10)
    assert [a(), b(), a(), b()] == [1, 1, 2, 11]


def test_calling_one_counter_does_not_move_a_later_one():
    first = make_counter()
    for _ in range(5):
        first()
    second = make_counter()
    assert second() == 0


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
