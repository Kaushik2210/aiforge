SUID, SGID, SVTX = 0o4000, 0o2000, 0o1000
ALL_BITS = 0o7777
USER, GROUP, OTHER = 0o700, 0o070, 0o007
READ, WRITE, EXEC = 0o444, 0o222, 0o111


def _octal(spec):
    """Parse an all-digit spec. Returns (value, mentioned_bits)."""
    if not all(c in "01234567" for c in spec):
        raise ValueError(f"invalid mode: {spec!r}")
    value = int(spec, 8)
    if value > ALL_BITS:
        raise ValueError(f"invalid mode: {spec!r} (larger than 7777)")
    if len(spec) < 5:
        mentioned = (value & (SUID | SGID)) | SVTX | 0o777
    else:
        mentioned = ALL_BITS
    return value, mentioned


def _parse_symbolic(spec):
    """Turn a symbolic spec into a list of (op, flag, affected, value, mentioned)."""
    changes = []
    i, n = 0, len(spec)
    while True:
        affected = 0
        while i < n and spec[i] in "ugoa":
            affected |= {"u": SUID | USER, "g": SGID | GROUP, "o": SVTX | OTHER, "a": ALL_BITS}[spec[i]]
            i += 1
        if i >= n or spec[i] not in "+-=":
            raise ValueError(f"invalid mode: {spec!r}")
        while i < n and spec[i] in "+-=":
            op = spec[i]
            i += 1
            if i < n and spec[i] in "ugo":
                value = {"u": USER, "g": GROUP, "o": OTHER}[spec[i]]
                flag = "copy"
                i += 1
            else:
                value, flag = 0, "plain"
                while i < n and spec[i] in "rwxXst":
                    c = spec[i]
                    if c == "r":
                        value |= READ
                    elif c == "w":
                        value |= WRITE
                    elif c == "x":
                        value |= EXEC
                    elif c == "X":
                        flag = "x-if-any"
                    elif c == "s":
                        value |= SUID | SGID
                    else:  # "t"
                        value |= SVTX
                    i += 1
            mentioned = affected & value if affected else value
            changes.append((op, flag, affected, value, mentioned))
        if i == n:
            return changes
        if spec[i] != ",":
            raise ValueError(f"invalid mode: {spec!r}")
        i += 1


def apply_chmod(mode, spec, is_dir=False, umask=0o022):
    if not isinstance(spec, str):
        raise TypeError("spec must be a str")
    if mode < 0:
        raise ValueError("mode must not be negative")
    if not spec:
        return mode & ALL_BITS
    new = mode & ALL_BITS
    umask &= 0o777
    if spec and spec[0] in "01234567":
        value, mentioned = _octal(spec)
        changes = [("=", "plain", ALL_BITS, value, mentioned)]
    else:
        changes = _parse_symbolic(spec)
    for op, flag, affected, value, mentioned in changes:
        omit = ((SUID | SGID) if is_dir else 0) & ~mentioned
        if flag == "copy":
            value &= new
            value |= (READ if value & READ else 0) | (WRITE if value & WRITE else 0) | (EXEC if value & EXEC else 0)
        elif flag == "x-if-any" and (new & EXEC or is_dir):
            value |= EXEC
        value &= (affected if affected else ~umask) & ~omit
        if op == "=":
            keep = (~affected if affected else 0) | omit
            new = (new & keep) | value
        elif op == "+":
            new |= value
        else:
            new &= ~value
    return new & ALL_BITS


def mode_string(mode, is_dir=False):
    mode &= ALL_BITS
    chars = []
    for shift in (6, 3, 0):
        bits = (mode >> shift) & 7
        chars += ["r" if bits & 4 else "-", "w" if bits & 2 else "-", "x" if bits & 1 else "-"]
    if mode & SUID:
        chars[2] = "s" if chars[2] == "x" else "S"
    if mode & SGID:
        chars[5] = "s" if chars[5] == "x" else "S"
    if mode & SVTX:
        chars[8] = "t" if chars[8] == "x" else "T"
    return ("d" if is_dir else "-") + "".join(chars)
