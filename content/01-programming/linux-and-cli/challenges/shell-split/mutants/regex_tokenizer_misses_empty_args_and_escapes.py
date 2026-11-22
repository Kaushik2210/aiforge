import re

# Wrong A: regex tokenizer. Gets the common cases but mishandles empty args, backslash
# rules inside double quotes and backslash-newline.
TOKEN = re.compile(r"""((?:[^\s'"\\]|\\.|'[^']*'|"(?:[^"\\]|\\.)*")+)""", re.S)


def shell_split(line):
    if not isinstance(line, str):
        raise TypeError("line")
    out = []
    pos = 0
    for m in TOKEN.finditer(line):
        if line[pos:m.start()].strip():
            raise ValueError("unterminated quote")
        pos = m.end()
        tok = m.group(1)
        res = []
        i = 0
        while i < len(tok):
            c = tok[i]
            if c == "\\":
                res.append(tok[i + 1])
                i += 2
            elif c == "'":
                j = tok.index("'", i + 1)
                res.append(tok[i + 1:j])
                i = j + 1
            elif c == '"':
                j = i + 1
                buf = []
                while tok[j] != '"':
                    if tok[j] == "\\":
                        buf.append(tok[j + 1])
                        j += 2
                    else:
                        buf.append(tok[j])
                        j += 1
                res.append("".join(buf))
                i = j + 1
            else:
                res.append(c)
                i += 1
        out.append("".join(res))
    if line[pos:].strip():
        raise ValueError("unterminated quote")
    return out
