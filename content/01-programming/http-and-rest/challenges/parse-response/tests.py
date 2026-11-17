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


def test_a_simple_response():
    status, reason, headers, body = parse_response(
        "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: 5\r\n\r\nhello"
    )
    assert status == 200 and isinstance(status, int)
    assert reason == "OK"
    assert dict(headers) == {"content-type": "text/plain", "content-length": "5"}
    assert body == "hello"


def test_the_reason_phrase_can_have_spaces():
    status, reason, headers, body = parse_response("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n")
    assert (status, reason, body) == (404, "Not Found", "")


def test_a_response_with_no_headers_and_no_body():
    status, reason, headers, body = parse_response("HTTP/1.1 204 No Content\r\n\r\n")
    assert (status, reason, dict(headers), body) == (204, "No Content", {}, "")


def test_header_lookup_ignores_case():
    _, _, headers, _ = parse_response("HTTP/1.1 200 OK\r\ncOnTeNt-TyPe: text/html\r\n\r\n")
    assert headers["Content-Type"] == "text/html"
    assert headers["content-type"] == "text/html"
    assert headers.get("CONTENT-TYPE") == "text/html"
    assert "Content-type" in headers
    assert headers.get("etag") is None


def test_a_value_may_contain_colons():
    _, _, headers, _ = parse_response("HTTP/1.1 200 OK\r\nDate: Tue, 17 Nov 2026 10:30:00 GMT\r\n\r\n")
    assert headers["date"] == "Tue, 17 Nov 2026 10:30:00 GMT"


def test_repeated_headers_are_joined_in_order():
    _, _, headers, _ = parse_response(
        "HTTP/1.1 200 OK\r\nVary: Accept\r\nvary: Accept-Encoding\r\nVARY: Origin\r\n\r\n"
    )
    assert headers["vary"] == "Accept, Accept-Encoding, Origin"


def test_content_length_ignores_extra_trailing_text():
    _, _, _, body = parse_response("HTTP/1.1 200 OK\r\nContent-Length: 5\r\n\r\nhelloEXTRA")
    assert body == "hello"


def test_bare_lf_line_endings_work():
    status, reason, headers, body = parse_response("HTTP/1.1 200 OK\nContent-Length: 2\n\nhi")
    assert (status, reason, headers["content-length"], body) == (200, "OK", "2", "hi")


def test_a_malformed_status_line_raises_value_error():
    for raw in ("garbage\r\n\r\n", "HTTP/1.1 OK 200\r\n\r\n", "HTTP/1.1 20 OK\r\n\r\n", "HTTP/1.1\r\n\r\n"):
        message = raises_value_error(raw)
        assert message is not None, f"{raw!r} should raise ValueError"
        assert "status line" in message, f"message should mention the status line: {message!r}"


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
