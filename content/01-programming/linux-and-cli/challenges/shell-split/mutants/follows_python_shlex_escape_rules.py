# Wrong B: a clean state machine that copies Python's shlex posix rules: in double quotes a
# backslash escapes only a double quote or a backslash, and backslash-newline is a plain
# escaped newline.
def shell_split(line):
    if not isinstance(line, str):
        raise TypeError("line")
    out, cur, started = [], [], False
    state = "n"  # n normal, s single, d double
    i = 0
    while i < len(line):
        c = line[i]
        if state == "n":
            if c in " \t\n":
                if started:
                    out.append("".join(cur))
                    cur, started = [], False
            elif c == "\\":
                if i + 1 >= len(line):
                    raise ValueError("trailing backslash")
                cur.append(line[i + 1])
                started = True
                i += 1
            elif c == "'":
                state, started = "s", True
            elif c == '"':
                state, started = "d", True
            else:
                cur.append(c)
                started = True
        elif state == "s":
            if c == "'":
                state = "n"
            else:
                cur.append(c)
        else:
            if c == '"':
                state = "n"
            elif c == "\\":
                if i + 1 >= len(line):
                    raise ValueError("unterminated quote")
                nxt = line[i + 1]
                if nxt in '"\\':
                    cur.append(nxt)
                    i += 1
                else:
                    cur.append(c)
            else:
                cur.append(c)
        i += 1
    if state != "n":
        raise ValueError("unterminated quote")
    if started:
        out.append("".join(cur))
    return out
