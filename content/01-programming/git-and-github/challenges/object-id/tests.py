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

# Real values: each id below was printed by git itself (git hash-object, git rev-parse).
ADA = "Ada Lovelace <ada@example.com> 1700000000 +0000"
GRACE = "Grace Hopper <grace@example.com> 1700000100 +0530"
ROOT_TREE = "371cfbfa71f65ddd2bec95b41af7ea87a5f201fc"
ROOT_COMMIT = "439ac476f83fef684fdb7104608a1ab9a656b7b4"
MAIN_COMMIT = "a4837f9c16326baed632c67ac051ce6a4d13d401"
SIDE_COMMIT = "a7867d0576ca5615459fedb23f8af598835ab1f7"
MERGE_COMMIT = "2b7c446f65ebd7f625363c1d5b9381020bd085b4"


def test_the_empty_blob():
    assert object_id("blob", b"") == "e69de29bb2d1d6434b8b29ae775ad8c2e48c5391"


def test_a_one_line_blob():
    assert object_id("blob", b"test content\n") == "d670460b4b4aece5915caf5c68d12f560a9fe3e4"


def test_a_multi_line_blob():
    assert object_id("blob", b"hello\nworld\n") == "94954abda49de8615a048f8d2e64b5de848e27a1"
    data = b"line one\nline two\n\nline four, tab\there\n"
    assert object_id("blob", data) == "0590753a9d1abeb58a7a06dfa279da3853d071ba"


def test_the_id_is_40_lower_case_hex_characters():
    got = object_id("blob", b"anything")
    assert isinstance(got, str) and len(got) == 40
    assert got == got.lower() and all(c in "0123456789abcdef" for c in got)


def test_the_kind_is_part_of_the_hash():
    assert object_id("blob", b"x") != object_id("commit", b"x")
    assert object_id("blob", b"x") != object_id("tree", b"x")


def test_a_real_tree_object():
    raw = bytes.fromhex(
        "3130303634342068656c6c6f2e74787400ce013625030ba8dba906f756967f9e9ca394464a"
        "343030303020737562000479003445f4e5a5ff25360c607ca79ffe4e4ea1"
    )
    assert object_id("tree", raw) == ROOT_TREE


def test_an_unknown_kind_is_a_value_error():
    for kind in ("file", "Blob", "", "blobs"):
        try:
            object_id(kind, b"")
        except ValueError:
            continue
        raise AssertionError(f"expected ValueError for kind {kind!r}")


def test_data_must_be_bytes():
    for data in ("text", None, 5, bytearray(b"x")):
        try:
            object_id("blob", data)
        except TypeError:
            continue
        raise AssertionError(f"expected TypeError for data {data!r}")


def test_a_root_commit_body_matches_git():
    body = commit_body(ROOT_TREE, [], ADA, GRACE, "First commit\n")
    assert isinstance(body, bytes)
    assert body == (
        b"tree " + ROOT_TREE.encode() + b"\n"
        b"author Ada Lovelace <ada@example.com> 1700000000 +0000\n"
        b"committer Grace Hopper <grace@example.com> 1700000100 +0530\n"
        b"\nFirst commit\n"
    )
    assert object_id("commit", body) == ROOT_COMMIT


def test_a_commit_with_one_parent_matches_git():
    when = " 1700002000 +0100"
    body = commit_body(
        "877947678e507790868edd61ada10a670924bea7",
        [ROOT_COMMIT],
        "Ada Lovelace <ada@example.com>" + when,
        "Grace Hopper <grace@example.com>" + when,
        "Add main file\n",
    )
    assert b"\nparent " + ROOT_COMMIT.encode() + b"\n" in body
    assert object_id("commit", body) == MAIN_COMMIT


def test_a_merge_commit_keeps_the_parent_order():
    when = " 1700003000 +0000"
    body = commit_body(
        "fff9ce938014e47f71028e0b61bdc0eb668a2d90",
        [MAIN_COMMIT, SIDE_COMMIT],
        "Ada Lovelace <ada@example.com>" + when,
        "Grace Hopper <grace@example.com>" + when,
        "Merge side\n\nTwo lines of body.\n",
    )
    assert body.index(MAIN_COMMIT.encode()) < body.index(SIDE_COMMIT.encode())
    assert object_id("commit", body) == MERGE_COMMIT


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
