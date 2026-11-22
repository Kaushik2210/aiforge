import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
shell_split = mod.shell_split

BS = chr(92)

# Lines and results produced by a real POSIX-mode shell (bash --posix from Git for Windows,
# running `eval "set -- LINE"` and printing "$@"). Only lines whose result did not involve
# expansion, comments or an unquoted newline are kept. Each row is (line, expected).
ORACLE_CASES = [
    ('b', ['b']),
    ('aa', ['aa']),
    ('ca', ['ca']),
    ("\\'", ["'"]),
    ('a\tb', ['a', 'b']),
    ('\\$b', ['$b']),
    ('c \n', ['c']),
    ('a \t', ['a']),
    (' \\ ', [' ']),
    ('""b', ['b']),
    ('b\\$', ['b$']),
    ('\\ b', [' b']),
    (" \\'", ["'"]),
    ("\\'\\ ", ["' "]),
    ('x ya', ['x', 'ya']),
    ('""\\\n', ['']),
    ('\\$\\ ', ['$ ']),
    (' b""', ['b']),
    ('\\ \\ ', ['  ']),
    ("\\'b\t", ["'b"]),
    ('\\"\\\'', ['"\'']),
    ('"\\\n"', ['']),
    ('\\\\\\\\', ['\\\\']),
    ("''\\'", ["'"]),
    ('bbx y', ['bbx', 'y']),
    ('a\\c\ta', ['ac', 'a']),
    ('a\\$\\\n', ['a$']),
    ('\\ \\`\n', [' `']),
    ('\\$a\\ ', ['$a ']),
    ('a\tb\\$', ['a', 'b$']),
    ('a\tx y', ['a', 'x', 'y']),
    ("a\\\\''", ['a\\']),
    ("a''\\'", ["a'"]),
    ("''\\$a", ['$a']),
    ('"a\\\\"', ['a\\']),
    ("c \t\\'", ['c', "'"]),
    ("\\'c\tb", ["'c", 'b']),
    ('\\\\a\\"', ['\\a"']),
    ('\\\'""bc', ["'bc"]),
    ('\\$ a\\$', ['$', 'a$']),
    ('\t\\"\\`b', ['"`b']),
    ('""\'\'a\n', ['a']),
    ("\\'b\\`b", ["'b`b"]),
    ('\t\tb\\\nb', ['bb']),
    ('\t cx y', ['cx', 'y']),
    ('\\ ""\\$', [' $']),
    ("\\\n''aa", ['aa']),
    ('\\"\\"\\\\', ['""\\']),
    (' c \\\n\t', ['c']),
    ("b'x y'", ['bx y']),
    ("b'\\$'bc", ['b\\$bc']),
    ("b'\\\\ 'c", ['b\\\\ c']),
    ('\\\n\t\\"\\ ', ['" ']),
    ('c\\\nb\t\\ ', ['cb', ' ']),
    ('\\\nb""\\ ', ['b ']),
    ('c  \\$\\\n', ['c', '$']),
    ('ba\\\n\\\\$', ['ba\\$']),
    ('b \\\\a""', ['b', '\\a']),
    ('\\\n""x y', ['x', 'y']),
    ('\\$c\\ \\`', ['$c `']),
    ('\t\\\n\\ \\$a', [' $a']),
    ('c""\' b\\\'', ['c b\\']),
    ('\\$b ""\'\'', ['$b', '']),
    ('a\\$\\\\\\"b', ['a$\\"b']),
    ('\\\n\t\\" a\t', ['"', 'a']),
    ('"""" \\\'\n', ['', "'"]),
    ("\\''' \\'b", ["'", "'b"]),
    ("\\'x y\\ac", ["'x", 'yac']),
    ('c\t"" \\\na', ['c', '', 'a']),
    (" ab\\'c  ", ["ab'c"]),
    ('\t\\`abc""', ['`abc']),
    ('c\\\nb\\"b a', ['cb"b', 'a']),
    ('\\"c""\'\' \n', ['"c']),
    ('\'\'\'\t\\$\\"\'', ['\t\\$\\"']),
    ('\\$b\taca\\\\', ['$b', 'aca\\']),
    ('\\\\\\a\\ ""a', ['\\a a']),
    ('ac\\ \\"c\'\'', ['ac "c']),
    ("\\ bc\\\n\\'b", [" bc'b"]),
    ('\\$  c\'\'""', ['$', 'c']),
    ('aa\\\n\\"\t\\\\', ['aa"', '\\']),
    ("''''\\$\\\nb ", ['$b']),
    ('\\\'""\\\'\\b\\"', ['\'\'b"']),
    ('\\\nb\\\\\\  ""', ['b\\ ', '']),
    ("''\\\\ bb\\'c", ['\\', "bb'c"]),
    ('\\\\\'"\\ \\\\\\\'', ['\\"\\ \\\\\\']),
    ('\\$\\"\\$\\`\'\'', ['$"$`']),
    ('\\\' \'\'\\\n\\" ', ["'", '"']),
    (" \\ ''''\t\\\\", [' ', '\\']),
    ("aaa''aa\\\nbb", ['aaaaabb']),
    ("'''\t\\ '\\\n''", ['\t\\ ']),
    ('\\\\ \\`\\"b c ', ['\\', '`"b', 'c']),
    ('abx y\t\\"a\\`', ['abx', 'y', '"a`']),
    ('b "" \\\\\\ \\\t', ['b', '', '\\ \t']),
    ('\\ \\\\""b\\"\\"', [' \\b""']),
    ('\\"\\"\\\\a\\\\\\`', ['""\\a\\`']),
    ('\\`x y""\'\\\'a', ['`x', 'y\\a']),
    ('\\\\ \'\'aca""\\"', ['\\', 'aca"']),
    ('""\\\\\\\'\\\\""ac', ["\\'\\ac"]),
    ("\\\n\\`\\'''\\\\''", ["`'\\"]),
    ("\\x y\\ ''\\'\\$", ['x', "y '$"]),
    (' a  \\\n\\"b \\ ', ['a', '"b', ' ']),
    ('a\\ ""\\ acba\\`', ['a  acba`']),
    ('""\\\\\t\\ ""\\\\\\ ', ['\\', ' \\ ']),
    ("\\'x yx yb\\\\''", ["'x", 'yx', 'yb\\']),
    ('\\\n\\"c\t \\\'\\\\\\\n', ['"c', "'\\"]),
    ("' ''\\' ''\\`ac", [' \\', '`ac']),
    ('b""\\ x y\t\\ ba', ['b x', 'y', ' ba']),
    ("ab\\\n\\$''ab\\`\\ ", ['ab$ab` ']),
    (" x y\\'''c'\\$\\'", ['x', "y'c\\$\\"]),
    ('b""\\`\\`\\`\\` \\\n', ['b````']),
]


def check(cases):
    for line, expected in cases:
        got = shell_split(line)
        assert got == expected, f"shell_split({line!r}) gave {got!r}, expected {expected!r}"


def raises_value_error(line):
    try:
        shell_split(line)
    except ValueError as e:
        return str(e)
    raise AssertionError(f"expected ValueError for {line!r}")


def test_cases_checked_against_a_real_posix_shell():
    check(ORACLE_CASES)


def test_backslash_newline_with_quotes_and_empty_arguments():
    check([
        (BS + "\n''", [""]),
        ('"' + BS + '\n"', [""]),
        ("a" + BS + "\n" + "''", ["a"]),
        ("''''", [""]),
        ('a"" b', ["a", "b"]),
        ('"a"\n"b"', ["a", "b"]),
        (" 'a' ", ["a"]),
        ("a" + BS + "\n" + BS + "\nb", ["ab"]),
        (BS + "\n" + BS + "\n", []),
    ])


def test_escapes_and_quotes_in_combination():
    check([
        (BS + BS + BS + BS, [BS + BS]),
        ('"' + BS + BS + BS + BS + '"', [BS + BS]),
        ('"' + BS + BS + BS + '"x"', [BS + '"x']),
        ("a'" + '"' + "'b", ['a"b']),
        ('a"' + "'" + '"b', ["a'b"]),
        ("'a'" + BS + "''b'", ["a'b"]),
        ('"' + BS + "'" + '"', [BS + "'"]),
        ('"' + BS + 'a' + BS + 'b"', [BS + "a" + BS + "b"]),
        ("a" + BS + BS + " b", ["a" + BS, "b"]),
        ("a" + BS + BS + BS + " b", ["a" + BS + " b"]),
    ])


def test_whitespace_kinds_inside_and_outside_quotes():
    check([
        ("a\t\t\tb", ["a", "b"]),
        ("a\n\n\nb", ["a", "b"]),
        ("\n\na\n\n", ["a"]),
        ("'a\tb' \"c\nd\"", ["a\tb", "c\nd"]),
        ("a" + BS + "\tb", ["a\tb"]),
        ("a" + BS + "\nb", ["ab"]),
        ("a\r\nb", ["a\r", "b"]),
    ])


def test_dollar_backtick_and_friends_stay_literal_in_every_context():
    check([
        ("$HOME", ["$HOME"]),
        ('"$HOME"', ["$HOME"]),
        ("'$HOME'", ["$HOME"]),
        ("`date`", ["`date`"]),
        ('"`date`"', ["`date`"]),
        ("$(date)", ["$(date)"]),
        ("*.py", ["*.py"]),
        ("~/x", ["~/x"]),
        ("{a,b}", ["{a,b}"]),
        ("a=b", ["a=b"]),
        ("!", ["!"]),
        ("a$'b'", ["a$b"]),
    ])


def test_errors_after_good_arguments_and_in_the_middle():
    for bad in ["a b 'c", "a \"b c", "a 'b' \"c", "'a' 'b", "x" + BS, "'x' " + BS]:
        raises_value_error(bad)
    assert "backslash" in raises_value_error("'a' " + BS).lower()
    assert "quote" in raises_value_error("a" + BS + " 'b").lower()


def test_backslash_newline_is_only_removed_where_the_rules_say_so():
    check([
        ("'a" + BS + "\nb'", ["a" + BS + "\nb"]),
        ("a" + BS + BS + "\nb", ["a" + BS, "b"]),
        ('"' + BS + BS + '\n"', [BS + "\n"]),
        ("'" + BS + "\n'", [BS + "\n"]),
        (BS + BS + BS + "\nx", [BS + "x"]),
    ])


def test_trailing_blanks_after_an_escape_are_not_trimmed():
    assert shell_split("a" + BS + " ") == ["a "]
    assert shell_split("a" + BS + "\t") == ["a\t"]


def test_big_inputs_stay_correct_and_reasonably_fast():
    assert shell_split("a " * 20_000) == ["a"] * 20_000
    assert shell_split("'" + "x y " * 10_000 + "'") == ["x y " * 10_000]
    assert shell_split("x" * 100_000) == ["x" * 100_000]
    assert shell_split("''" * 1000) == [""]
    assert shell_split(("a" + BS + "\n") * 10_000 + "b") == ["a" * 10_000 + "b"]


def test_an_empty_or_blank_line_is_an_empty_list_not_an_empty_argument():
    assert shell_split("") == []
    assert shell_split(" \t\n") == []
    assert shell_split("''") == [""]


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001 - report any failure kind
                failures += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failures else 0)
