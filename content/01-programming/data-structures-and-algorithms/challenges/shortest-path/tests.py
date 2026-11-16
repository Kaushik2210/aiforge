import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
shortest_path_length = mod.shortest_path_length


def test_a_simple_path():
    graph = {"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": []}
    assert shortest_path_length(graph, "a", "d") == 2


def test_the_start_is_the_goal():
    assert shortest_path_length({"a": ["b"]}, "a", "a") == 0


def test_an_unreachable_goal_is_minus_one():
    graph = {"a": ["b"], "b": [], "c": ["a"]}
    assert shortest_path_length(graph, "a", "c") == -1


def test_steps_are_one_way():
    graph = {"a": ["b"], "b": []}
    assert shortest_path_length(graph, "a", "b") == 1
    assert shortest_path_length(graph, "b", "a") == -1


def test_the_shorter_of_two_routes_wins():
    graph = {"s": ["a", "g"], "a": ["b"], "b": ["c"], "c": ["g"], "g": []}
    assert shortest_path_length(graph, "s", "g") == 1


def test_loops_do_not_trap_the_search():
    graph = {"a": ["b"], "b": ["a", "c"], "c": ["b", "d"], "d": ["c"]}
    assert shortest_path_length(graph, "a", "d") == 3
    assert shortest_path_length(graph, "a", "zzz") == -1


def test_a_node_without_its_own_entry_is_fine():
    graph = {"a": ["b"]}  # "b" has no entry
    assert shortest_path_length(graph, "a", "b") == 1
    assert shortest_path_length(graph, "a", "c") == -1


def test_a_long_trail_does_not_blow_the_stack():
    n = 20_000
    graph = {i: [i + 1] for i in range(n)}
    graph[n] = []
    assert shortest_path_length(graph, 0, n) == n


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
