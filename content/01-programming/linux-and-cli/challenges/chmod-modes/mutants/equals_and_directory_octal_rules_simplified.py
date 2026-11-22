# Wrong solution C: close to correct, but "=" with a who only clears the rwx bits (never
# special bits), numeric specs on directories always keep setuid/setgid even with 5 digits,
# and the umask is applied only when adding.
S = 0o7000
ALL = 0o7777
CL = {"u": 0o700, "g": 0o070, "o": 0o007}


def apply_chmod(mode, spec, is_dir=False, umask=0o022):
    if not isinstance(spec, str):
        raise TypeError("spec")
    cur = mode & ALL
    if spec[:1].isdigit():
        if not all(c in "01234567" for c in spec) or int(spec, 8) > ALL:
            raise ValueError(f"bad mode {spec!r}")
        v = int(spec, 8)
        if is_dir:
            v |= cur & 0o6000
        return v
    for clause in spec.split(","):
        k = 0
        who = 0
        while k < len(clause) and clause[k] in "ugoa":
            who |= 0o777 if clause[k] == "a" else CL[clause[k]]
            k += 1
        if k == len(clause) or clause[k] not in "-+=":
            raise ValueError(f"bad mode {spec!r}")
        has_who = who != 0
        who = who or 0o777
        while k < len(clause):
            op = clause[k]
            k += 1
            val = 0
            kind = None
            while k < len(clause) and clause[k] not in "-+=":
                c = clause[k]
                k += 1
                if c in "rwx":
                    val |= {"r": 0o444, "w": 0o222, "x": 0o111}[c]
                elif c == "X":
                    if is_dir or cur & 0o111:
                        val |= 0o111
                elif c == "s":
                    val |= 0o6000 & (0o4000 if who & 0o700 else 0) | 0o2000 * bool(who & 0o070)
                elif c == "t":
                    val |= 0o1000 * bool(who & 0o007)
                elif c in "ugo":
                    b = (cur & CL[c]) >> {"u": 6, "g": 3, "o": 0}[c]
                    val |= b * 0o111
                else:
                    raise ValueError(f"bad mode {spec!r}")
            m = who | (0o7000 if (val & 0o7000) else 0)
            val &= who | 0o7000
            if not has_who and op == "+":
                val &= ~umask
            if op == "+":
                cur |= val
            elif op == "-":
                cur &= ~val
            else:
                cur = (cur & ~(who)) | (val & (who | 0o7000))
    return cur & ALL


def mode_string(mode, is_dir=False):
    s = ["d" if is_dir else "-"]
    for sh in (6, 3, 0):
        b = (mode >> sh) & 7
        s += ["r" if b & 4 else "-", "w" if b & 2 else "-", "x" if b & 1 else "-"]
    for bit, pos, lo in ((0o4000, 3, "s"), (0o2000, 6, "s"), (0o1000, 9, "t")):
        if mode & bit:
            s[pos] = lo if s[pos] == "x" else lo.upper()
    return "".join(s)
