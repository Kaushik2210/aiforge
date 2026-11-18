import hashlib  # noqa: F401  (you will need it)
import re  # noqa: F401

KINDS = ("blob", "tree", "commit", "tag")
_HEX40 = re.compile(r"[0-9a-f]{40}")


def object_id(kind, data):
    """Return the Git object id (40 lower-case hex characters) of one object.

    Git hashes the text "<kind> <length>" + a NUL byte (b"\0") + the data, with
    SHA-1. <length> is the number of BYTES in data, written in decimal.

    kind  one of "blob", "tree", "commit", "tag" (exact lower-case spelling)
    data  the object's content, as bytes

    - A kind that is not a str raises TypeError. A str that is not one of the
      four kinds (for example "Blob" or "file") raises ValueError.
    - data that is not bytes (a str, a bytearray, None, ...) raises TypeError.
      The kind is checked before the data.

    object_id("blob", b"")               -> "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"
    object_id("blob", b"test content\n") -> "d670460b4b4aece5915caf5c68d12f560a9fe3e4"
    """
    # TODO: check kind and data, then hash header + data with hashlib.sha1
    raise NotImplementedError("implement object_id")


def commit_body(tree, parents, author, committer, message):
    """Return the exact bytes of a commit object's content (what object_id hashes).

    tree       the tree id: 40 lower-case hex characters
    parents    a list or tuple of parent commit ids (same format), first parent
               first; an empty list for a root commit
    author     the whole author value, for example
               "Ada Lovelace <ada@example.com> 1700000000 +0000"
               (name, email in angle brackets, then the time as
               "<unix seconds> <+/-hhmm>": seconds since 1970 and the UTC offset)
    committer  the whole committer value, same shape as author
    message    the message as a str. It is written EXACTLY as given: no newline
               is added, so pass "First commit\n" to match what git writes.

    Layout (every line ends with a line feed, b"\n"):
        tree <tree>
        parent <id>          (one line per parent, in the order given)
        author <author>
        committer <committer>
        <empty line>
        <message>
    The text is encoded as UTF-8.

    Errors
    - parents that is not a list or a tuple (a bare str, for example) raises TypeError.
    - A tree or parent id that is not 40 lower-case hex characters raises ValueError.
    - An author or committer containing a line feed raises ValueError.
    """
    # TODO: validate, then join the lines and encode as UTF-8
    raise NotImplementedError("implement commit_body")
