import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
parse_ratio = mod.parse_ratio


def test_zero_numerator():
    assert parse_ratio("0/5") == 0.0


def test_negative_denominator():
    assert parse_ratio("1/-4") == -0.25


def test_large_numbers():
    assert parse_ratio("1000000/4") == 250000.0


def test_true_division_not_floor_division():
    assert parse_ratio("7/2") == 3.5


def test_zero_over_zero_is_still_a_value_error():
    try:
        parse_ratio("0/0")
    except ValueError:
        return
    raise AssertionError("0/0 should raise ValueError")


def test_other_non_strings_are_not_value_errors():
    for bad in (5, 2.5, ["1/2"], b"1/2"):
        try:
            parse_ratio(bad)
        except ValueError:
            raise AssertionError(f"{bad!r} must not become a ValueError")
        except Exception:  # noqa: BLE001
            continue
        raise AssertionError(f"{bad!r} should raise an error")


def test_only_whole_numbers_are_accepted():
    for bad in ("1/2.0", "1e3/2", "0x10/2"):
        try:
            parse_ratio(bad)
        except ValueError:
            continue
        raise AssertionError(f"{bad!r} should raise ValueError")


def test_the_zero_message_is_not_empty_for_any_numerator():
    for text in ("5/0", "-3/0", "0/0"):
        try:
            parse_ratio(text)
        except ValueError as e:
            assert str(e).strip() != ""
        else:
            raise AssertionError(f"{text!r} should raise ValueError")


def test_whatever_int_accepts_is_allowed():
    assert parse_ratio("+1/2") == 0.5
    assert parse_ratio("1_0/2") == 5.0
    assert parse_ratio("1 /2") == 0.5


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
