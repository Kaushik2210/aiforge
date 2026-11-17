import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
parse_response = mod.parse_response


def raises_value_error(raw):
    try:
        parse_response(raw)
    except ValueError as e:
        return str(e)
    return None


def test_a_short_body_is_an_error():
    message = raises_value_error("HTTP/1.1 200 OK\r\nContent-Length: 10\r\n\r\nabc")
    assert message is not None and "incomplete" in message


def test_a_bad_content_length_is_an_error():
    for value in ("abc", "-1", "1.5", "5, 5", ""):
        raw = f"HTTP/1.1 200 OK\r\nContent-Length: {value}\r\n\r\nhello"
        assert raises_value_error(raw) is not None, f"Content-Length {value!r} should raise ValueError"


def test_without_content_length_the_body_is_everything_left():
    _, _, _, body = parse_response("HTTP/1.1 200 OK\r\nX: 1\r\n\r\nline one\r\n\r\nline two\r\n")
    assert body == "line one\r\n\r\nline two\r\n"


def test_content_length_keeps_blank_lines_inside_the_body():
    _, _, _, body = parse_response("HTTP/1.1 200 OK\r\nContent-Length: 8\r\n\r\na\r\n\r\nb\r\nZZZ")
    assert body == "a\r\n\r\nb\r\n"


def test_values_are_trimmed_but_not_changed_inside():
    _, _, headers, _ = parse_response("HTTP/1.1 200 OK\r\nX-Note:   two  words \t\r\n\r\n")
    assert headers["x-note"] == "two  words"


def test_a_header_line_without_a_colon_is_an_error():
    assert raises_value_error("HTTP/1.1 200 OK\r\nNot a header\r\n\r\n") is not None


def test_bad_header_names_are_errors():
    assert raises_value_error("HTTP/1.1 200 OK\r\nBad Name: x\r\n\r\n") is not None
    assert raises_value_error("HTTP/1.1 200 OK\r\nName : x\r\n\r\n") is not None
    assert raises_value_error("HTTP/1.1 200 OK\r\n: x\r\n\r\n") is not None


def test_folded_header_lines_are_rejected():
    assert raises_value_error("HTTP/1.1 200 OK\r\nX: a\r\n b\r\n\r\n") is not None
    assert raises_value_error("HTTP/1.1 200 OK\r\nX: a\r\n\tb\r\n\r\n") is not None


def test_an_empty_header_value_is_allowed():
    _, _, headers, _ = parse_response("HTTP/1.1 200 OK\r\nX-Empty:\r\nX-Blank:   \r\n\r\n")
    assert headers["x-empty"] == "" and headers["x-blank"] == ""


def test_two_content_length_lines_are_not_digits_only():
    raw = "HTTP/1.1 200 OK\r\nContent-Length: 5\r\nContent-Length: 5\r\n\r\nhello"
    assert raises_value_error(raw) is not None


def test_the_version_must_look_like_http():
    assert raises_value_error("FTP/1.1 200 OK\r\n\r\n") is not None
    assert raises_value_error("HTTP/1 200 OK\r\n\r\n") is not None
    assert raises_value_error("http/1.1 200 OK\r\n\r\n") is not None
    assert parse_response("HTTP/1.0 200 OK\r\n\r\n")[0] == 200
    assert parse_response("HTTP/2.0 200 OK\r\n\r\n")[0] == 200


def test_the_status_code_must_be_exactly_three_ascii_digits():
    for code in ("2000", "99", "abc", "٢٠٠", "+20"):
        assert raises_value_error(f"HTTP/1.1 {code} OK\r\n\r\n") is not None, code


def test_a_missing_reason_is_allowed():
    assert parse_response("HTTP/1.1 200 \r\n\r\n")[:2] == (200, "")
    assert parse_response("HTTP/1.1 200\r\n\r\n")[:2] == (200, "")


def test_empty_input_is_an_error():
    assert raises_value_error("") is not None
    assert raises_value_error("  \r\n") is not None


def test_no_blank_line_means_everything_is_head():
    status, reason, headers, body = parse_response("HTTP/1.1 200 OK\r\nX-A: 1\r\n")
    assert (status, headers["x-a"], body) == (200, "1", "")


def test_mixed_line_endings_work():
    status, _, headers, body = parse_response("HTTP/1.1 200 OK\r\nA: 1\nB: 2\r\n\nbody")
    assert (status, headers["a"], headers["b"], body) == (200, "1", "2", "body")


def test_content_length_zero_gives_an_empty_body():
    assert parse_response("HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\nignored")[3] == ""


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
