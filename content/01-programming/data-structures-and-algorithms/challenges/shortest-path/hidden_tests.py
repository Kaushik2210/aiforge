import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
shortest_path_length = mod.shortest_path_length


class CountingGraph(dict):
    """A dict that counts how many times a node's neighbours are looked up."""

    lookups = 0

    def __getitem__(self, key):
        type(self).lookups += 1
        return super().__getitem__(key)

    def get(self, key, default=None):
        type(self).lookups += 1
        return super().get(key, default)


def test_a_node_is_looked_up_at_most_once():
    # a dense graph full of loops: every node points at the next 5 and back at the first
    n = 400
    data = {i: [(i + k) % n for k in range(1, 6)] + [0] for i in range(n)}
    graph = CountingGraph(data)
    CountingGraph.lookups = 0
    assert shortest_path_length(graph, 0, n - 1) != -1
    assert CountingGraph.lookups <= n


def test_depth_first_would_find_a_longer_route():
    graph = {"a": ["b", "g"], "b": ["c"], "c": ["d"], "d": ["g"], "g": []}
    assert shortest_path_length(graph, "a", "g") == 1


def test_depth_first_in_either_order_finds_a_longer_route():
    # the long way round is listed last here, so a stack-based search that takes the last neighbour first goes deep
    graph = {"a": ["g", "b"], "b": ["c"], "c": ["d"], "d": ["g"], "g": []}
    assert shortest_path_length(graph, "a", "g") == 1
    graph2 = {0: [5, 1], 1: [2], 2: [3], 3: [4], 4: [6], 5: [6], 6: []}
    assert shortest_path_length(graph2, 0, 6) == 2


def test_a_trap_for_going_deep_first():
    graph = {0: [1, 5], 1: [2], 2: [3], 3: [4], 4: [6], 5: [6], 6: []}
    assert shortest_path_length(graph, 0, 6) == 2


def test_a_grid_of_cells():
    # a 30 x 30 grid where you can step right or down
    size = 30
    graph = {}
    for r in range(size):
        for c in range(size):
            nxt = []
            if r + 1 < size:
                nxt.append((r + 1, c))
            if c + 1 < size:
                nxt.append((r, c + 1))
            graph[(r, c)] = nxt
    assert shortest_path_length(graph, (0, 0), (size - 1, size - 1)) == 2 * (size - 1)
    assert shortest_path_length(graph, (size - 1, size - 1), (0, 0)) == -1


def test_a_cycle_back_to_the_start():
    graph = {"a": ["b"], "b": ["c"], "c": ["a"]}
    assert shortest_path_length(graph, "a", "a") == 0
    assert shortest_path_length(graph, "a", "c") == 2


def test_nodes_can_be_numbers_strings_or_tuples():
    graph = {1: ["x"], "x": [(2, 3)], (2, 3): []}
    assert shortest_path_length(graph, 1, (2, 3)) == 2


def test_the_start_need_not_be_in_the_graph():
    assert shortest_path_length({"a": ["b"]}, "q", "b") == -1
    assert shortest_path_length({}, "q", "q") == 0


def test_a_very_long_path_with_loops_back():
    n = 15_000
    graph = {i: [i + 1, max(0, i - 3)] for i in range(n)}
    graph[n] = []
    assert shortest_path_length(graph, 0, n) == n


class ReadOnlyGraph(dict):
    """A graph that may only be read by looking up one node at a time."""

    def _no(self, *args, **kwargs):
        raise AssertionError("do not copy, scan or change the whole graph: look nodes up one at a time")

    items = keys = values = copy = pop = popitem = clear = update = setdefault = __iter__ = __setitem__ = __delitem__ = _no


def test_the_graph_is_only_read_one_node_at_a_time():
    graph = ReadOnlyGraph({"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": []})
    assert shortest_path_length(graph, "a", "d") == 2
    assert shortest_path_length(graph, "d", "a") == -1


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
