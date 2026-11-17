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
    """Parse the text of one HTTP/1.1 response into (status_code, reason, headers, body).

    Returns a tuple:
      status_code  an int, for example 404
      reason       the reason phrase as text ("Not Found"; "" if there is none)
      headers      a Headers (see above). Names are lower-cased. A header that
                   appears more than once is joined in order with ", ".
                   Values have surrounding spaces and tabs removed.
      body         a string, see below

    Rules
    - Lines end with CRLF ("\r\n"), but a bare LF ("\n") must work too.
    - The head ends at the first empty line. If there is no empty line, the
      whole text is the head and the body is "".
    - Status line: "HTTP/<digit>.<digit> <3 digits>[ <reason>]". "HTTP" is
      upper case and the digits are ASCII 0-9 (not other scripts). Anything
      else raises ValueError("malformed status line: ...").
    - Header line: "name: value". The name must be a token (letters, digits and
      !#$%&'*+-.^_`|~) with nothing before the colon. A line without a colon,
      with a bad name, or one that starts with a space or tab (old "folded"
      lines) raises ValueError. A value may be empty: "X:" gives "".
    - If content-length is present it must be ASCII digits only (else
      ValueError). Because repeated headers are joined first, two
      Content-Length lines give "5, 5", which is not digits only.
      The body is exactly that many characters; extra trailing text is ignored.
      If the text holds fewer characters, raise ValueError("incomplete body ...").
    - With no content-length, the body is everything after the empty line.
    - Empty or all-blank input raises ValueError.

    parse_response("HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nhi")
        -> (200, "OK", {"content-length": "2"}, "hi")

    (Real HTTP counts bytes; this exercise counts characters to stay simple.)
    """
    # TODO: split head from body, parse the status line, then the headers, then the body
    raise NotImplementedError("implement parse_response")
