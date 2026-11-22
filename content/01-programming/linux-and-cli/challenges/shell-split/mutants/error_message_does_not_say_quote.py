def shell_split(line):
    if not isinstance(line, str):
        raise TypeError("line must be a str")
    args = []
    current = []
    in_word = False  # True once the current argument has started (even if empty)
    i, n = 0, len(line)
    while i < n:
        c = line[i]
        if c in " \t\n":
            if in_word:
                args.append("".join(current))
                current = []
                in_word = False
            i += 1
        elif c == "\\":
            if i + 1 >= n:
                raise ValueError("trailing backslash")
            nxt = line[i + 1]
            if nxt != "\n":  # backslash-newline is removed and starts nothing
                current.append(nxt)
                in_word = True
            i += 2
        elif c == "'":
            end = line.find("'", i + 1)
            if end == -1:
                raise ValueError("unterminated string")
            current.append(line[i + 1 : end])
            in_word = True
            i = end + 1
        elif c == '"':
            i += 1
            in_word = True
            while True:
                if i >= n:
                    raise ValueError("unterminated double quote")
                d = line[i]
                if d == '"':
                    i += 1
                    break
                if d == "\\":
                    if i + 1 >= n:
                        raise ValueError("unterminated double quote")
                    nxt = line[i + 1]
                    if nxt == "\n":
                        i += 2
                    elif nxt in '\\"$`':
                        current.append(nxt)
                        i += 2
                    else:
                        current.append("\\")
                        i += 1
                else:
                    current.append(d)
                    i += 1
        else:
            current.append(c)
            in_word = True
            i += 1
    if in_word:
        args.append("".join(current))
    return args
