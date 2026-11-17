import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
retry_delay = mod.retry_delay


def test_method_case_does_not_matter():
    assert retry_delay("get", 503, 0) == 0.5
    assert retry_delay("Put", 503, 0) == 0.5
    assert retry_delay("post", 503, 0) is None


def test_other_methods_count_as_unsafe_to_repeat():
    assert retry_delay("CONNECT", 503, 0) is None
    assert retry_delay("LOCK", 503, 0) is None
    assert retry_delay("TRACE", 503, 0) is None


def test_the_idempotency_key_must_not_be_empty():
    assert retry_delay("POST", 503, 0, {"Idempotency-Key": ""}) is None
    assert retry_delay("POST", 503, 0, {"Idempotency-Key": "  "}) is None


def test_an_idempotency_key_does_not_retry_a_status_that_is_not_retryable():
    assert retry_delay("POST", 400, 0, {"Idempotency-Key": "k"}) is None
    assert retry_delay("POST", 201, 0, {"Idempotency-Key": "k"}) is None


def test_the_idempotency_key_still_obeys_the_attempt_limit():
    assert retry_delay("POST", 503, 5, {"Idempotency-Key": "k"}) is None


def test_header_names_ignore_case():
    assert retry_delay("GET", 429, 0, {"RETRY-AFTER": "7"}) == 7.0
    assert retry_delay("POST", 500, 0, {"IDEMPOTENCY-KEY": "k"}) == 0.5


def test_retry_after_is_not_capped_and_may_be_zero():
    assert retry_delay("GET", 503, 0, {"Retry-After": "120"}) == 120.0
    assert retry_delay("GET", 429, 2, {"Retry-After": "0"}) == 0.0
    assert retry_delay("GET", 429, 0, {"Retry-After": " 5 "}) == 5.0


def test_bad_retry_after_values_fall_back_to_backoff():
    for value in ("Wed, 21 Oct 2026 07:28:00 GMT", "1.5", "-3", "abc", "", "5s", "٣", "+4"):
        assert retry_delay("GET", 503, 1, {"Retry-After": value}) == 1.0, value
        assert retry_delay("GET", 429, 2, {"Retry-After": value}) == 2.0, value


def test_retry_after_is_ignored_for_500_502_and_504():
    for status in (500, 502, 504):
        assert retry_delay("GET", status, 0, {"Retry-After": "30"}) == 0.5, status


def test_retry_after_does_not_override_the_attempt_limit():
    assert retry_delay("GET", 429, 5, {"Retry-After": "1"}) is None
    assert retry_delay("GET", 429, 2, {"Retry-After": "1"}, max_retries=2) is None


def test_retry_after_does_not_make_post_safe():
    assert retry_delay("POST", 429, 0, {"Retry-After": "1"}) is None


def test_base_and_max_retries_can_be_changed():
    assert retry_delay("GET", 500, 2, base=1.0) == 4.0
    assert retry_delay("GET", 500, 2, base=1.0, cap=3.0) == 3.0
    assert retry_delay("GET", 500, 0, max_retries=0) is None
    assert retry_delay("GET", 500, 7, max_retries=10, cap=100.0) == 64.0


def test_none_headers_and_other_headers_are_fine():
    assert retry_delay("GET", 500, 0, None) == 0.5
    assert retry_delay("GET", 500, 0, {"Content-Type": "text/plain"}) == 0.5


def test_a_negative_attempt_is_an_error():
    for status in (500, 404):
        try:
            retry_delay("GET", status, -1)
        except ValueError:
            continue
        raise AssertionError("a negative attempt should raise ValueError")


def test_other_statuses_are_not_retried():
    for status in (408, 425, 505, 511, 600):
        assert retry_delay("GET", status, 0) is None, status


def test_the_headers_dict_is_not_changed():
    headers = {"Retry-After": "3", "Idempotency-Key": "k"}
    retry_delay("POST", 503, 0, headers)
    assert headers == {"Retry-After": "3", "Idempotency-Key": "k"}


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
