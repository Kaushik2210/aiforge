import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
collect = mod.collect


def test_returns_a_list_with_the_item():
    assert collect(1) == [1]


def test_separate_calls_do_not_share_a_list():
    assert collect(1) == [1]
    assert collect(2) == [2]
    assert collect(3) == [3]


def test_adds_to_the_end_of_a_given_list():
    assert collect(3, [1, 2]) == [1, 2, 3]


def test_changes_the_given_list_in_place():
    b = [1]
    result = collect(2, b)
    assert b == [1, 2]
    assert result is b


def test_an_empty_list_is_still_used():
    b = []
    result = collect("x", b)
    assert b == ["x"]
    assert result is b


def test_new_lists_are_different_objects():
    a = collect(1)
    b = collect(1)
    assert a == b
    assert a is not b


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
