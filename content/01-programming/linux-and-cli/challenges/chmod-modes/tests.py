import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
apply_chmod = mod.apply_chmod
mode_string = mod.mode_string

F, D = False, True


def check(cases):
    """Each case is (start mode, spec, is_dir, umask, expected mode)."""
    for start, spec_text, is_dir, umask, expected in cases:
        got = apply_chmod(start, spec_text, is_dir, umask)
        assert got == expected, (
            f"apply_chmod({start:#06o}, {spec_text!r}, is_dir={is_dir}, umask={umask:#05o}) "
            f"gave {got:#06o}, expected {expected:#06o}"
        )


def raises(exc, fn, *args):
    try:
        fn(*args)
    except exc as e:
        return str(e)
    raise AssertionError(f"expected {exc.__name__} from {args!r}")


def test_octal_specs_set_all_the_bits():
    check([
        (0o644, "755", F, 0o022, 0o755),
        (0o755, "0644", F, 0o022, 0o644),
        (0o644, "600", F, 0o077, 0o600),
        (0o755, "4755", F, 0o022, 0o4755),
        (0o644, "0", F, 0o022, 0o000),
        (0o644, "7777", F, 0o022, 0o7777),
        (0o4755, "755", F, 0o022, 0o755),  # on a file, an octal spec clears setuid
        (0o644, "1777", D, 0o022, 0o1777),
    ])


def test_octal_ignores_the_umask():
    check([(0o600, "777", F, 0o077, 0o777), (0o600, "666", F, 0o777, 0o666)])


def test_symbolic_add_remove_set_with_a_who():
    check([
        (0o644, "u+x", F, 0o022, 0o744),
        (0o644, "g+w", F, 0o022, 0o664),
        (0o644, "o-r", F, 0o022, 0o640),
        (0o755, "go-rwx", F, 0o022, 0o700),
        (0o644, "a=r", F, 0o022, 0o444),
        (0o644, "a+x", F, 0o077, 0o755),
        (0o755, "u=rw,go=r", F, 0o022, 0o644),
        (0o755, "ug=rx,o=", F, 0o022, 0o550),
        (0o755, "a=", F, 0o022, 0o000),
        (0o755, "go=", F, 0o022, 0o700),
    ])


def test_equals_replaces_only_the_named_classes():
    check([
        (0o777, "u=r", F, 0o022, 0o477),
        (0o640, "g=rwx", F, 0o022, 0o670),
        (0o640, "o=g", F, 0o022, 0o644),
    ])


def test_several_clauses_and_several_operators():
    check([
        (0o600, "a+r,go-w", F, 0o022, 0o644),
        (0o660, "og+rX-w", F, 0o022, 0o644),
        (0o700, "u=rwx,g=rx,o=", F, 0o022, 0o750),
        (0o644, "u+x,g+x", F, 0o022, 0o754),
        (0o644, "a=r+w", F, 0o022, 0o666),
    ])


def test_omitting_who_means_all_but_respects_the_umask():
    check([
        (0o644, "+x", F, 0o027, 0o754),
        (0o644, "+x", F, 0o000, 0o755),
        (0o444, "+w", F, 0o022, 0o644),
        (0o444, "+w", F, 0o002, 0o664),
        (0o600, "+r", F, 0o077, 0o600),
        (0o600, "+r", F, 0o027, 0o640),
        (0o644, "a+x", F, 0o077, 0o755),
    ])


def test_equals_without_who_clears_everything_then_applies_the_umask():
    check([
        (0o755, "=rw", F, 0o022, 0o644),
        (0o755, "=", F, 0o022, 0o000),
        (0o644, "=rwx", F, 0o077, 0o700),
    ])


def test_removing_without_who_is_also_limited_by_the_umask():
    check([
        (0o444, "-r", F, 0o077, 0o044),
        (0o755, "-x", F, 0o027, 0o645),
        (0o755, "-x", F, 0o000, 0o644),
    ])


def test_capital_x_adds_execute_only_for_directories_or_if_some_x_is_set():
    check([
        (0o644, "a+X", F, 0o022, 0o644),
        (0o744, "a+X", F, 0o022, 0o755),
        (0o001, "u+X", F, 0o022, 0o101),
        (0o644, "a+X", D, 0o022, 0o755),
        (0o640, "u+X", D, 0o022, 0o740),
        (0o600, "go+rX", F, 0o022, 0o644),
        (0o700, "go+rX", F, 0o022, 0o755),
    ])


def test_setuid_setgid_and_sticky_letters():
    check([
        (0o755, "u+s", F, 0o022, 0o4755),
        (0o755, "g+s", F, 0o022, 0o2755),
        (0o755, "a+s", F, 0o022, 0o6755),
        (0o755, "+t", F, 0o022, 0o1755),
        (0o755, "o+t", F, 0o022, 0o1755),
        (0o6755, "a-s", F, 0o022, 0o755),
        (0o1755, "-t", F, 0o022, 0o755),
        (0o1755, "a-t", F, 0o022, 0o755),
    ])


def test_letters_that_have_no_effect_in_gnu_chmod():
    check([
        (0o755, "o+s", F, 0o022, 0o755),
        (0o755, "u+t", F, 0o022, 0o755),
        (0o755, "g+t", F, 0o022, 0o755),
    ])


def test_equals_on_a_file_also_clears_special_bits_of_the_named_classes():
    check([
        (0o4755, "u=rwx", F, 0o022, 0o755),
        (0o2755, "g=rx", F, 0o022, 0o755),
        (0o4755, "go=rx", F, 0o022, 0o4755),
        (0o7755, "a=rx", F, 0o022, 0o555),
    ])


def test_copying_permissions_from_another_class():
    check([
        (0o644, "g=u", F, 0o022, 0o664),
        (0o754, "o=g", F, 0o022, 0o755),
        (0o664, "o+g", F, 0o022, 0o666),
        (0o741, "o+g", F, 0o022, 0o745),
        (0o700, "go=u", F, 0o022, 0o777),
        (0o777, "g-u", F, 0o022, 0o707),
        (0o640, "u=g", F, 0o022, 0o440),
        (0o604, "g=o", F, 0o022, 0o644),
    ])


def test_directories_keep_setuid_and_setgid_unless_they_are_mentioned():
    check([
        (0o2755, "755", D, 0o022, 0o2755),
        (0o2755, "0755", D, 0o022, 0o2755),
        (0o4755, "u=rwx,go=rx", D, 0o022, 0o4755),
        (0o2755, "00755", D, 0o022, 0o755),
        (0o2755, "a-s", D, 0o022, 0o755),
        (0o755, "2755", D, 0o022, 0o2755),
        (0o2755, "=rx", D, 0o022, 0o2555),
        (0o2755, "=rx", F, 0o022, 0o555),
    ])


def test_mode_string_for_plain_modes():
    assert mode_string(0o755, True) == "drwxr-xr-x"
    assert mode_string(0o644) == "-rw-r--r--"
    assert mode_string(0o000) == "----------"
    assert mode_string(0o777, False) == "-rwxrwxrwx"
    assert mode_string(0o640, True) == "drw-r-----"


def test_mode_string_for_special_bits():
    assert mode_string(0o4755) == "-rwsr-xr-x"
    assert mode_string(0o4644) == "-rwSr--r--"
    assert mode_string(0o2755) == "-rwxr-sr-x"
    assert mode_string(0o2705) == "-rwx--Sr-x"
    assert mode_string(0o1777, True) == "drwxrwxrwt"
    assert mode_string(0o1776, True) == "drwxrwxrwT"
    assert mode_string(0o7777) == "-rwsrwsrwt"


def test_invalid_specs_raise_value_error_naming_the_spec():
    for bad in ["", "u", "a", "u+y", "z+x", "u+x,", ",u+x", "755x", "8", "77777", "u+x g+w", "u=rwx,g=ux"]:
        message = raises(ValueError, apply_chmod, 0o644, bad)
        assert repr(bad) in message, (bad, message)


def test_a_spec_that_is_not_text_is_a_type_error():
    raises(TypeError, apply_chmod, 0o644, 755)
    raises(TypeError, apply_chmod, 0o644, b"u+x")


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
