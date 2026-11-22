import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
shell_split = mod.shell_split


def check(cases):
    for line, expected in cases:
        got = shell_split(line)
        assert got == expected, f"shell_split({line!r}) gave {got!r}, expected {expected!r}"


def error_for(line):
    try:
        shell_split(line)
    except ValueError as e:
        return str(e)
    raise AssertionError(f"expected ValueError for {line!r}")


def test_unquoted_whitespace_separates_and_runs_collapse():
    check([
        ("a b c", ["a", "b", "c"]),
        ("  a   b\tc\nd  ", ["a", "b", "c", "d"]),
        ("", []),
        ("   \t\n ", []),
        ("one", ["one"]),
    ])


def test_single_quotes_keep_everything_literal():
    check([
        (r"'a b'", ["a b"]),
        (r"'a\b'", ["a" + chr(92) + "b"]),
        ("'a\"b'", ['a"b']),
        (r"'$HOME *'", ["$HOME *"]),
        (r"'a\\b'", ["a" + chr(92) * 2 + "b"]),
        ("'a\nb'", ["a\nb"]),
        (r"'  x  '", ["  x  "]),
    ])


def test_double_quotes_keep_most_things_literal():
    check([
        ('"a b"', ["a b"]),
        ("\"it's\"", ["it's"]),
        ('"$HOME `x` *"', ["$HOME `x` *"]),
        ('"a\tb"', ["a\tb"]),
        ('"a\nb"', ["a\nb"]),
    ])


def test_backslash_inside_double_quotes_escapes_only_five_characters():
    bs = chr(92)
    check([
        ('"a' + bs + '"b"', ['a"b']),
        ('"a' + bs + bs + 'b"', ["a" + bs + "b"]),
        ('"' + bs + '$x"', ["$x"]),
        ('"' + bs + '`"', ["`"]),
        ('"a' + bs + 'qb"', ["a" + bs + "qb"]),
        ('"a' + bs + ' b"', ["a" + bs + " b"]),
        ('"a' + bs + "\nb" + '"', ["ab"]),
    ])


def test_unquoted_backslash_escapes_the_next_character():
    bs = chr(92)
    check([
        ("a" + bs + " b", ["a b"]),
        (bs + '"', ['"']),
        (bs + "'", ["'"]),
        (bs + bs, [bs]),
        (bs + "a", ["a"]),
        ("a" + bs + "$b", ["a$b"]),
        (bs + "*", ["*"]),
    ])


def test_backslash_newline_is_removed_and_does_not_separate():
    bs = chr(92)
    check([
        ("a" + bs + "\nb", ["ab"]),
        ("a " + bs + "\n b", ["a", "b"]),
        (bs + "\n", []),
        ("a " + bs + "\n", ["a"]),
    ])


def test_adjacent_parts_join_into_one_argument():
    check([
        ('"a"' + "'b'c", ["abc"]),
        ("a'b c'd", ["ab cd"]),
        ('x"y z"w', ["xy zw"]),
        ("'a'\"b\"", ["ab"]),
        (r"echo 'it'" + chr(92) + "''s'", ["echo", "it's"]),
    ])


def test_empty_quotes_make_empty_arguments():
    check([
        ("''", [""]),
        ('""', [""]),
        ("a '' b", ["a", "", "b"]),
        ('"" ""', ["", ""]),
        ("a''", ["a"]),
        ("''a", ["a"]),
        ("a ''", ["a", ""]),
    ])


def test_nothing_is_expanded_and_hash_is_not_special():
    check([
        ("a*b ~ $x ${y} $(z) `w`", ["a*b", "~", "$x", "${y}", "$(z)", "`w`"]),
        ("a #b", ["a", "#b"]),
        ("a#b", ["a#b"]),
        ("# not a comment", ["#", "not", "a", "comment"]),
        ("a ; b | c & d > e < f", ["a", ";", "b", "|", "c", "&", "d", ">", "e", "<", "f"]),
    ])


def test_only_space_tab_and_newline_separate():
    check([
        ("a\rb", ["a\rb"]),
        ("a\r b", ["a\r", "b"]),
        ("a b", ["a b"]),
        ("a\x0bb", ["a\x0bb"]),
        ("café 'naïve ☃'", ["café", "naïve ☃"]),
    ])


def test_real_looking_command_lines():
    check([
        ('grep -r "hello world" ./src', ["grep", "-r", "hello world", "./src"]),
        ('git commit -m "Fix ' + chr(92) + '"bug' + chr(92) + '""', ["git", "commit", "-m", 'Fix "bug"']),
        ("find . -name '*.py' -print0", ["find", ".", "-name", "*.py", "-print0"]),
        ("cp my" + chr(92) + " file.txt /tmp", ["cp", "my file.txt", "/tmp"]),
    ])


def test_unterminated_quotes_are_errors_that_mention_quote():
    for bad in ["'abc", '"abc', "a 'b", 'a "b', "'a'b'", '"a"b"', "'", '"']:
        assert "quote" in error_for(bad).lower(), bad


def test_a_trailing_lone_backslash_is_an_error_that_mentions_backslash():
    bs = chr(92)
    for bad in ["abc" + bs, bs, "a b " + bs, "a" + bs + bs + bs]:
        assert "backslash" in error_for(bad).lower(), bad


def test_a_double_quoted_string_that_ends_in_a_backslash_is_unterminated():
    bs = chr(92)
    assert "quote" in error_for('"abc' + bs).lower()
    assert "quote" in error_for('"abc' + bs + '"').lower()


def test_the_input_must_be_a_str():
    for bad in [b"a b", None, 5, ["a"]]:
        try:
            shell_split(bad)
        except TypeError:
            continue
        raise AssertionError(f"expected TypeError for {bad!r}")


def test_returns_a_new_list_of_strings():
    r = shell_split("a b")
    assert isinstance(r, list) and all(type(x) is str for x in r)
    r.append("z")
    assert shell_split("a b") == ["a", "b"]


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
