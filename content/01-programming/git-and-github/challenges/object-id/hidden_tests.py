import hashlib
import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
object_id = mod.object_id
commit_body = mod.commit_body

T = "371cfbfa71f65ddd2bec95b41af7ea87a5f201fc"
P1 = "a4837f9c16326baed632c67ac051ce6a4d13d401"
P2 = "a7867d0576ca5615459fedb23f8af598835ab1f7"
WHO = "Ada Lovelace <ada@example.com> 1700000000 +0000"


def raises(exc, fn, *args):
    try:
        fn(*args)
    except exc:
        return True
    except Exception as e:  # noqa: BLE001
        raise AssertionError(f"expected {exc.__name__}, got {type(e).__name__}") from e
    raise AssertionError(f"expected {exc.__name__}, nothing raised")


def test_the_length_counts_bytes_not_characters():
    # the accented e is 2 bytes in UTF-8, so "caf" + e + newline is 6 bytes but 5 characters
    assert object_id("blob", "café\n".encode("utf-8")) == "572eb43fe8e34fb87d01c69e01151ff696022924"


def test_a_nul_byte_inside_the_data_is_fine():
    assert object_id("blob", b"a\x00b") == "20b5be91886d0b6f26dc98a225c0dac05fe2c86e"


def test_another_blob_from_git():
    assert object_id("blob", b"hello\n") == "ce013625030ba8dba906f756967f9e9ca394464a"
    assert object_id("blob", b"what is up, doc?") == "bd9dbf5aae1a3862dd1526723246b20206e5fc37"


def test_a_real_annotated_tag_object():
    data = (
        b"object a4837f9c16326baed632c67ac051ce6a4d13d401\n"
        b"type commit\ntag v1\n"
        b"tagger Grace Hopper <grace@example.com> 1700004000 +0000\n"
        b"\nRelease one\n"
    )
    assert object_id("tag", data) == "cead61ad281015bcfe05ba760b8d11e155505318"


def test_the_kind_must_be_a_str():
    for kind in (b"blob", None, 3):
        assert raises(TypeError, object_id, kind, b"")


def test_the_kind_is_checked_before_the_data():
    assert raises(ValueError, object_id, "nope", "not bytes")
    assert raises(TypeError, object_id, "blob", "not bytes")


def test_a_large_blob():
    data = b"x" * 100_000
    assert object_id("blob", data) == hashlib.sha1(b"blob 100000\x00" + data).hexdigest()


def test_the_message_is_written_as_given():
    body = commit_body(T, [], WHO, WHO, "no newline at the end")
    assert body.endswith(b"\n\nno newline at the end")
    body = commit_body(T, [], WHO, WHO, "")
    assert body.endswith(b"committer " + WHO.encode() + b"\n\n")


def test_the_message_and_names_are_utf8():
    body = commit_body(T, [], "Zoë <z@example.com> 1700000000 +0000", WHO, "café\n")
    assert "Zoë".encode("utf-8") in body and body.endswith("café\n".encode("utf-8"))


def test_parents_may_be_a_tuple_and_keep_their_order():
    a = commit_body(T, (P1, P2), WHO, WHO, "m\n")
    b = commit_body(T, [P2, P1], WHO, WHO, "m\n")
    assert a != b
    assert a == commit_body(T, [P1, P2], WHO, WHO, "m\n")
    assert a.count(b"parent ") == 2


def test_the_line_order_is_tree_parents_author_committer():
    lines = commit_body(T, [P1], WHO, "C <c@example.com> 1 +0000", "m\n").split(b"\n")
    assert [x.split(b" ")[0] for x in lines[:4]] == [b"tree", b"parent", b"author", b"committer"]
    assert lines[4] == b""


def test_parents_must_be_a_list_or_tuple():
    assert raises(TypeError, commit_body, T, P1, WHO, WHO, "m\n")
    assert raises(TypeError, commit_body, T, None, WHO, WHO, "m\n")


def test_ids_must_be_40_lower_case_hex_characters():
    assert raises(ValueError, commit_body, T.upper(), [], WHO, WHO, "m\n")
    assert raises(ValueError, commit_body, T[:39], [], WHO, WHO, "m\n")
    assert raises(ValueError, commit_body, T + "0", [], WHO, WHO, "m\n")
    assert raises(ValueError, commit_body, T, ["zz" * 20], WHO, WHO, "m\n")
    assert raises(ValueError, commit_body, T, [P1, "bad"], WHO, WHO, "m\n")
    assert raises(ValueError, commit_body, "", [], WHO, WHO, "m\n")


def test_author_and_committer_must_be_one_line():
    assert raises(ValueError, commit_body, T, [], WHO + "\nparent " + P1, WHO, "m\n")
    assert raises(ValueError, commit_body, T, [], WHO, WHO + "\n", "m\n")


def test_ids_with_a_trailing_line_feed_or_upper_case_parent_are_rejected():
    assert raises(ValueError, commit_body, T, [P1 + "\n"], WHO, WHO, "m\n")
    assert raises(ValueError, commit_body, T, [P1.upper()], WHO, WHO, "m\n")
    assert raises(ValueError, commit_body, T[:39] + "\n", [], WHO, WHO, "m\n")


def test_the_kind_must_match_exactly_and_data_must_be_real_bytes():
    for kind in (" blob", "blob\n", "blob ", "BLOB"):
        assert raises(ValueError, object_id, kind, b"")
    assert raises(TypeError, object_id, "blob", memoryview(b"x"))


def test_repeated_parents_are_all_written():
    body = commit_body(T, [P1, P1], WHO, WHO, "m\n")
    assert body.count(b"parent " + P1.encode() + b"\n") == 2


def test_the_parent_list_is_not_changed():
    parents = [P1, P2]
    commit_body(T, parents, WHO, WHO, "m\n")
    assert parents == [P1, P2]


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
