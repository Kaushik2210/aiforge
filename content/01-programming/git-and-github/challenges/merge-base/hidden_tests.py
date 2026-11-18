import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
merge_base = mod.merge_base


def key_error_for(graph, a, b):
    try:
        merge_base(graph, a, b)
    except KeyError as e:
        return str(e)
    raise AssertionError("expected KeyError")


def test_criss_cross_ties_sort_alphabetically_not_by_insertion_order():
    # "z1" is inserted before "m1" and is reached first, but "m1" sorts first.
    g = {"root": [], "z1": ["root"], "m1": ["root"], "x": ["z1", "m1"], "y": ["m1", "z1"]}
    assert merge_base(g, "x", "y") == "m1"
    assert merge_base(g, "y", "x") == "m1"


def test_three_way_criss_cross_picks_the_smallest_of_three():
    g = {
        "o": [],
        "c": ["o"],
        "b": ["o"],
        "a": ["o"],
        "p": ["c", "b", "a"],
        "q": ["a", "c", "b"],
    }
    assert merge_base(g, "p", "q") == "a"


def test_string_order_is_plain_text_order():
    # "c10" sorts before "c9" as text
    g = {"o": [], "c9": ["o"], "c10": ["o"], "x": ["c9", "c10"], "y": ["c10", "c9"]}
    assert merge_base(g, "x", "y") == "c10"


def test_a_common_ancestor_below_a_best_one_is_never_returned():
    # r and q and k are all common; k is the best, the others lie below it.
    g = {"r": [], "q": ["r"], "k": ["q"], "a": ["k"], "b": ["k", "r"]}
    assert merge_base(g, "a", "b") == "k"


def test_the_second_parent_path_counts():
    g = {"r": [], "s": ["r"], "t": ["r"], "m": ["t", "s"], "n": ["s"]}
    assert merge_base(g, "m", "n") == "s"


def test_an_ancestor_reached_only_through_second_parents():
    g = {"r": [], "p1": ["r"], "p2": ["r"], "m": ["p1", "p2"], "w": ["r", "m"], "v": ["p2"]}
    assert merge_base(g, "w", "v") == "p2"


def test_unrelated_roots_with_merges_return_none():
    g = {"a": [], "b": ["a"], "m": ["b"], "x": [], "y": ["x"], "n": ["y"]}
    assert merge_base(g, "m", "n") is None


def test_a_root_and_its_descendant():
    g = {"root": [], "kid": ["root"]}
    assert merge_base(g, "root", "kid") == "root"
    assert merge_base(g, "kid", "root") == "root"


def test_every_parent_of_a_common_commit_is_covered_not_only_the_first():
    # m is the best; d (its SECOND parent) is common too, lies below m and sorts first.
    g = {"r": [], "x": ["r"], "d": ["r"], "m": ["x", "d"], "a": ["m"], "b": ["m"]}
    assert merge_base(g, "a", "b") == "m"


def test_the_same_unknown_commit_twice_is_still_a_key_error():
    g = {"a": []}
    assert "zzz" in key_error_for(g, "zzz", "zzz")


def test_unknown_ids_name_the_id_and_a_is_checked_first():
    g = {"a": [], "b": ["a"]}
    assert "nope" in key_error_for(g, "nope", "b")
    assert "gone" in key_error_for(g, "a", "gone")
    assert "first" in key_error_for(g, "first", "second")


def test_a_parent_that_is_missing_from_the_graph_is_a_key_error():
    g = {"a": ["ghost"], "b": ["a"]}
    assert "ghost" in key_error_for(g, "b", "a")


def test_the_empty_graph_has_no_commits():
    assert "a" in key_error_for({}, "a", "b")


def test_a_ladder_of_merges_is_fast():
    # 1500 diamonds in a row: walking every path would take forever.
    g = {"n0": []}
    for i in range(1, 1501):
        g[f"l{i}"] = [f"n{i - 1}"]
        g[f"r{i}"] = [f"n{i - 1}"]
        g[f"n{i}"] = [f"l{i}", f"r{i}"]
    g["tip"] = ["n1500"]
    g["other"] = ["l700"]
    assert merge_base(g, "tip", "other") == "l700"
    assert merge_base(g, "n1500", "n1499") == "n1499"


def test_a_very_long_line_with_two_tips():
    n = 30_000
    g = {"c0": []}
    for i in range(1, n):
        g[f"c{i:05d}"] = [f"c{i - 1:05d}"] if i > 1 else ["c0"]
    g["t1"] = [f"c{n - 1:05d}"]
    g["t2"] = ["c00010"]
    assert merge_base(g, "t1", "t2") == "c00010"


def test_the_answer_is_one_of_the_commits_given():
    g = {"r": [], "x": ["r"]}
    assert merge_base(g, "x", "x") == "x"
    assert merge_base(g, "r", "r") == "r"


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
