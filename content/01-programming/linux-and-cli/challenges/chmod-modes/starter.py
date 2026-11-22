def apply_chmod(mode, spec, is_dir=False, umask=0o022):
    """Apply a chmod-style mode spec to a permission mode and return the new mode.

    mode    an int. Only its low 12 bits count (setuid 0o4000, setgid 0o2000,
            sticky 0o1000, then rwx for user 0o700, group 0o070, other 0o007).
            Higher bits (such as the file-type bits of st_mode) are ignored.
            A negative mode raises ValueError.
    spec    a str. Anything else raises TypeError. See the two forms below.
    is_dir  True if the path is a directory (matters for X and for setuid/setgid)
    umask   used only when a symbolic clause has no "who" letters. Only its low
            9 bits count.

    The result is an int in 0..0o7777. The spec is NOT modified or checked
    against the real file system; this is only arithmetic on bits.

    A spec that is invalid raises ValueError. The message must contain
    repr(spec).

    Form 1, octal: one or more digits 0-7 only, such as "755", "0644", "4755" or
    "00755". Values above 7777 (octal) are invalid ("77777"). It sets all 12
    bits at once and ignores the umask. Special bits on DIRECTORIES: with four
    digits or fewer, a directory keeps its current setuid and setgid bits unless
    the number itself sets them ("755" on a directory with setgid keeps setgid;
    "2755" sets it). With five or more digits ("00755") a directory loses them
    like a file does. A regular file always gets exactly the 12 bits given.

    Form 2, symbolic: clauses separated by commas, such as "u=rwx,go=rx" or
    "a+r,g-w". Each clause is  WHO OP PERMS [OP PERMS ...]  where
      WHO    zero or more of u g o a  (a means u, g and o together; an empty WHO
             means "all, but bits set in the umask are not added")
      OP     + (add), - (remove), = (set exactly)
      PERMS  zero or more of r w x X s t   OR   a single one of u g o
             X means "x, but only if is_dir is true or the mode already has an
             x bit for someone". s means setuid (for u) and setgid (for g). t is
             the sticky bit. A single u, g or o copies that class's current
             permissions (the rwx bits as they are at that moment) onto the
             named classes, for example "g=u".
    Clauses are applied from left to right, each on the result of the one before.

    Rules to follow exactly (they match GNU chmod; see GNU coreutils, "File
    permissions", and gnulib modechange.c):
    - An empty WHO uses the umask: bits that the umask has set are never ADDED,
      and (also) never REMOVED, and "=" with an empty WHO clears all bits first
      and then sets only the permitted ones. So with umask 0o022, "+w" adds write
      for the owner only, and "-x" with umask 0o027 removes x from user and
      group but not from other.
    - With a WHO, the umask is not used at all.
    - "=" replaces the named classes: u= also clears setuid, g= also clears
      setgid, o= also clears sticky, on a regular file. a= (or an empty WHO)
      clears all 12 bits first. On a DIRECTORY, "=" keeps its setuid and setgid
      bits unless the clause itself contains s: "u=rwx", "a=rx" and "g=u" leave
      a directory's setuid and setgid alone, while "a=s" or "u=s" replace them.
    - "+" and "-" change special bits only through s and t.
    - s applies only to the u and g part: "u+s" sets setuid, "g+s" sets setgid,
      "a+s" and "+s" set both, "o+s" does nothing. t applies only to the o part:
      "o+t", "a+t" and "+t" set sticky; "u+t" and "g+t" do nothing.
    - NOT supported (raise ValueError): operator-octal specs such as "+440" or
      "=755", spaces, upper-case letters other than X, and anything not in the
      grammar above. An empty spec is invalid. A clause with WHO but no OP ("u")
      is invalid. "u+" and "=" (empty PERMS) are valid. After a copy letter only
      an operator or a comma may follow ("g=ux" is invalid).

    Examples:
        apply_chmod(0o644, "755")            -> 0o755
        apply_chmod(0o644, "u+x")            -> 0o744
        apply_chmod(0o644, "+x", umask=0o027) -> 0o754
        apply_chmod(0o755, "go-rwx")         -> 0o700
        apply_chmod(0o640, "a+X", is_dir=True) -> 0o751
        apply_chmod(0o644, "g=u")            -> 0o664
        apply_chmod(0o755, "u+s")            -> 0o4755
    """
    # TODO: parse the spec into a list of changes, then apply them one by one.
    # Work with whole masks: user = 0o700, group = 0o070, other = 0o007.
    raise NotImplementedError("implement apply_chmod")


def mode_string(mode, is_dir=False):
    """Return the ls -l style string for a mode, such as "drwxr-xr-x".

    The first character is "d" if is_dir else "-". Then nine characters for user,
    group and other: r or -, w or -, x or -. Only the low 12 bits of mode count.
    Special bits replace the execute character of their class:
      setuid (user):  "s" if the user x bit is set, else "S"
      setgid (group): "s" if the group x bit is set, else "S"
      sticky (other): "t" if the other x bit is set, else "T"

    mode_string(0o755, True)  -> "drwxr-xr-x"
    mode_string(0o4755)       -> "-rwsr-xr-x"
    mode_string(0o4644)       -> "-rwSr--r--"
    mode_string(0o1777, True) -> "drwxrwxrwt"
    """
    # TODO: build the nine characters, then fix the three execute positions.
    raise NotImplementedError("implement mode_string")
