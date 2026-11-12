import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
make_counter = mod.make_counter


def test_counts_from_zero_by_default():
    c = make_counter()
    assert [c(), c(), c()] == [0, 1, 2]


def test_first_call_returns_start():
    c = make_counter(10, 5)
    assert c() == 10
    assert c() == 15
    assert c() == 20


def test_step_by_keyword():
    c = make_counter(step=5)
    assert [c(), c(), c()] == [0, 5, 10]


def test_negative_step_counts_down():
    c = make_counter(10, -2)
    assert [c(), c(), c()] == [10, 8, 6]


def test_counters_are_independent():
    a = make_counter()
    b = make_counter()
    assert a() == 0
    assert a() == 1
    assert b() == 0  # b has not been called yet, so it starts fresh
    assert a() == 2


def test_the_result_is_a_callable_with_no_arguments():
    c = make_counter(3)
    assert callable(c)
    assert c() == 3


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
