# Wrong: treats an invalid Content-Length as absent instead of raising.
import re

_TOKEN = re.compile(r"[!#$%&'*+\-.^_`|~0-9A-Za-z]+")
_VERSION = re.compile(r"HTTP/[0-9]\.[0-9]")
_CODE = re.compile(r"[0-9]{3}")


class Headers(dict):
    """A dict whose names are stored in lower case and looked up without regard to case.

    Provided for you. headers["Content-Type"], headers.get("content-type") and
    "CONTENT-TYPE" in headers all find the same entry. Store names LOWER-CASED
    when you fill it in: headers["content-type"] = "text/html".
    """

    def __getitem__(self, name):
        return super().__getitem__(name.lower())

    def get(self, name, default=None):
        return super().get(name.lower(), default)

    def __contains__(self, name):
        return super().__contains__(name.lower())


def parse_response(raw):
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError("empty response")

    blank = re.search(r"\r?\n\r?\n", raw)
    if blank:
        head, rest = raw[: blank.start()], raw[blank.end():]
    else:
        head, rest = raw, ""

    lines = re.split(r"\r?\n", head)
    if lines and lines[-1] == "":
        lines.pop()

    parts = lines[0].split(" ", 2)
    if len(parts) < 2 or not _VERSION.fullmatch(parts[0]) or not _CODE.fullmatch(parts[1]):
        raise ValueError(f"malformed status line: {lines[0]!r}")
    status = int(parts[1])
    reason = parts[2] if len(parts) == 3 else ""

    headers = Headers()
    for line in lines[1:]:
        if line[:1] in (" ", "\t"):
            raise ValueError(f"folded header lines are not supported: {line!r}")
        name, colon, value = line.partition(":")
        if not colon or not _TOKEN.fullmatch(name):
            raise ValueError(f"malformed header line: {line!r}")
        name = name.lower()
        value = value.strip(" \t")
        headers[name] = headers[name] + ", " + value if name in headers else value

    length = headers.get("content-length")
    if length is None:
        body = rest
    else:
        if not (length.isascii() and length.isdigit()):
            return status, reason, headers, rest
        n = int(length)
        if len(rest) < n:
            raise ValueError(f"incomplete body: expected {n} characters, got {len(rest)}")
        body = rest[:n]

    return status, reason, headers, body
