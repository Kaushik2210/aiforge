import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
retry_delay = mod.retry_delay


def test_backoff_doubles_from_half_a_second():
    assert [retry_delay("GET", 503, a) for a in range(5)] == [0.5, 1.0, 2.0, 4.0, 8.0]


def test_the_delay_is_a_float():
    assert isinstance(retry_delay("GET", 500, 1), float)


def test_gives_up_after_five_retries():
    assert retry_delay("GET", 500, 4) is not None
    assert retry_delay("GET", 500, 5) is None
    assert retry_delay("GET", 500, 9) is None


def test_only_server_trouble_statuses_are_retried():
    for status in (500, 502, 503, 504, 429):
        assert retry_delay("GET", status, 0) is not None, status
    for status in (200, 201, 204, 301, 304, 400, 401, 403, 404, 422, 501):
        assert retry_delay("GET", status, 0) is None, status


def test_idempotent_methods_are_retried():
    for method in ("GET", "HEAD", "PUT", "DELETE", "OPTIONS"):
        assert retry_delay(method, 503, 0) == 0.5, method


def test_post_and_patch_are_not_retried_by_default():
    assert retry_delay("POST", 503, 0) is None
    assert retry_delay("PATCH", 500, 0) is None


def test_an_idempotency_key_makes_post_safe_to_retry():
    assert retry_delay("POST", 503, 0, {"Idempotency-Key": "abc-123"}) == 0.5
    assert retry_delay("PATCH", 502, 1, {"idempotency-key": "abc-123"}) == 1.0


def test_retry_after_seconds_is_used_for_429_and_503():
    assert retry_delay("GET", 429, 0, {"Retry-After": "30"}) == 30.0
    assert retry_delay("GET", 503, 3, {"retry-after": "2"}) == 2.0


def test_the_backoff_is_capped():
    assert retry_delay("GET", 500, 4, cap=2.0) == 2.0
    assert retry_delay("GET", 500, 1, cap=2.0) == 1.0


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
