import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
parse_ratio = mod.parse_ratio


def raises(exc, *args):
    try:
        parse_ratio(*args)
    except exc as e:
        return e
    except Exception as other:  # noqa: BLE001
        raise AssertionError(f"expected {exc.__name__} for {args!r}, got {type(other).__name__}")
    raise AssertionError(f"expected {exc.__name__} for {args!r}, but nothing was raised")


def test_simple_ratios():
    assert parse_ratio("3/4") == 0.75
    assert parse_ratio("1/2") == 0.5


def test_returns_a_float():
    result = parse_ratio("4/2")
    assert result == 2.0
    assert isinstance(result, float)


def test_negative_numbers():
    assert parse_ratio("-1/2") == -0.5


def test_spaces_around_the_numbers():
    assert parse_ratio(" 6 / 8 ") == 0.75


def test_a_zero_denominator_is_a_value_error_with_a_message():
    e = raises(ValueError, "1/0")
    assert str(e) != ""


def test_malformed_text_is_a_value_error():
    for bad in ("abc", "", "3", "1/2/3", "1.5/2", "a/b"):
        raises(ValueError, bad)


def test_a_non_string_is_not_turned_into_a_value_error():
    try:
        parse_ratio(None)
    except ValueError:
        raise AssertionError("None must not become a ValueError")
    except Exception:  # noqa: BLE001 - any other error is fine
        return
    raise AssertionError("None should raise some error, not return a value")


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
