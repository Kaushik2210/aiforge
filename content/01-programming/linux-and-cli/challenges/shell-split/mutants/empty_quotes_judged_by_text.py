# Wrong C: correct escaping rules, but decides whether an argument exists by looking at the
# text (non-empty), so empty quotes vanish, and joins backslash-newline with a space.
def shell_split(line):
    if not isinstance(line, str):
        raise TypeError("line")
    line = line.replace("\\\n", " ")
    out, cur = [], ""
    q = None
    i = 0
    while i < len(line):
        c = line[i]
        if q == "'":
            if c == "'":
                q = None
            else:
                cur += c
        elif q == '"':
            if c == '"':
                q = None
            elif c == "\\" and i + 1 < len(line) and line[i + 1] in '\\"$`':
                cur += line[i + 1]
                i += 1
            else:
                cur += c
        elif c in "'\"":
            q = c
        elif c == "\\":
            if i + 1 >= len(line):
                raise ValueError("trailing backslash")
            cur += line[i + 1]
            i += 1
        elif c in " \t\n":
            if cur:
                out.append(cur)
                cur = ""
        else:
            cur += c
        i += 1
    if q:
        raise ValueError("unterminated quote")
    if cur:
        out.append(cur)
    return out
