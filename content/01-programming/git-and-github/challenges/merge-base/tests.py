import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
merge_base = mod.merge_base

LINEAR = {"a": [], "b": ["a"], "c": ["b"], "d": ["c"]}

# r -- x1 -- x2          (feature)
#  \
#   -- y1 -- y2 -- y3    (main)
FORK = {"r": [], "x1": ["r"], "x2": ["x1"], "y1": ["r"], "y2": ["y1"], "y3": ["y2"]}

# A merge commit m has two parents; base r, side s, main t.
MERGE = {"r": [], "s": ["r"], "t": ["r"], "m": ["t", "s"], "after": ["m"]}

# top
#  |  \
# left right     both come from base
#  |  /
# base
DIAMOND = {"base": [], "left": ["base"], "right": ["base"], "top": ["left", "right"], "side": ["right"]}

# Criss-cross: a2 merges a1 and b1, b2 merges b1 and a1.
CRISS = {"o": [], "a1": ["o"], "b1": ["o"], "a2": ["a1", "b1"], "b2": ["b1", "a1"]}

# The nearest common commit (by steps) is not the best one here:
# a reaches r in one step, but q is below a and above r.
DEEP = {"r": [], "q": ["r"], "p": ["q"], "a": ["r", "p"], "b": ["q"]}


def test_linear_history_returns_the_older_commit():
    assert merge_base(LINEAR, "d", "b") == "b"
    assert merge_base(LINEAR, "b", "d") == "b"
    assert merge_base(LINEAR, "d", "a") == "a"


def test_a_commit_is_its_own_ancestor():
    assert merge_base(LINEAR, "c", "c") == "c"
    assert merge_base(LINEAR, "a", "a") == "a"


def test_a_fork_returns_the_fork_point():
    assert merge_base(FORK, "x2", "y3") == "r"
    assert merge_base(FORK, "y3", "x2") == "r"
    assert merge_base(FORK, "x1", "y1") == "r"


def test_a_branch_tip_and_its_own_ancestor():
    assert merge_base(FORK, "y3", "y1") == "y1"
    assert merge_base(FORK, "y3", "r") == "r"


def test_a_merge_commit_has_both_parents_as_ancestors():
    assert merge_base(MERGE, "m", "s") == "s"
    assert merge_base(MERGE, "m", "t") == "t"
    assert merge_base(MERGE, "after", "s") == "s"
    assert merge_base(MERGE, "s", "t") == "r"


def test_a_diamond():
    assert merge_base(DIAMOND, "left", "right") == "base"
    assert merge_base(DIAMOND, "top", "side") == "right"
    assert merge_base(DIAMOND, "top", "left") == "left"


def test_the_best_ancestor_is_not_just_the_nearest():
    assert merge_base(DEEP, "a", "b") == "q"
    assert merge_base(DEEP, "b", "a") == "q"


def test_criss_cross_returns_the_first_best_in_alphabetical_order():
    assert merge_base(CRISS, "a2", "b2") == "a1"
    assert merge_base(CRISS, "b2", "a2") == "a1"


def test_unrelated_histories_return_none():
    g = {"a": [], "b": ["a"], "x": [], "y": ["x"]}
    assert merge_base(g, "b", "y") is None
    assert merge_base(g, "a", "x") is None


def test_an_unknown_commit_is_a_key_error_that_names_it():
    for a, b, bad in (("zzz", "a", "zzz"), ("a", "nope", "nope")):
        try:
            merge_base(LINEAR, a, b)
        except KeyError as e:
            assert bad in str(e), str(e)
        else:
            raise AssertionError("expected KeyError")


def test_a_long_history_does_not_hit_the_recursion_limit():
    n = 20_000
    g = {"c0": []}
    for i in range(1, n):
        g[f"c{i}"] = [f"c{i - 1}"]
    g["side"] = ["c10"]
    assert merge_base(g, f"c{n - 1}", "side") == "c10"
    assert merge_base(g, f"c{n - 1}", "c0") == "c0"


def test_the_graph_is_not_changed():
    graph = {k: list(v) for k, v in CRISS.items()}
    merge_base(graph, "a2", "b2")
    merge_base(graph, "a2", "a1")
    assert graph == CRISS and all(isinstance(v, list) for v in graph.values())


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
