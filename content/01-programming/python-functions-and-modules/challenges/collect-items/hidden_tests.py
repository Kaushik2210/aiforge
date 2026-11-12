import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
collect = mod.collect


def test_many_calls_stay_separate():
    for i in range(50):
        assert collect(i) == [i]


def test_two_given_lists_stay_separate():
    a, b = [], []
    collect(1, a)
    collect(2, b)
    assert a == [1] and b == [2]


def test_none_item_is_a_normal_item():
    assert collect(None) == [None]
    b = []
    collect(None, b)
    assert b == [None]


def test_a_list_passed_twice_keeps_growing():
    b = []
    collect(1, b)
    collect(2, b)
    collect(3, b)
    assert b == [1, 2, 3]


def test_bucket_can_be_passed_by_keyword():
    b = [9]
    assert collect(item=1, bucket=b) is b
    assert b == [9, 1]


def test_a_fresh_call_after_using_a_given_list_is_clean():
    b = [1, 2]
    collect(3, b)
    assert collect(4) == [4]


def test_passing_none_explicitly_means_no_bucket():
    assert collect(1, None) == [1]
    assert collect(2, None) == [2]


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
