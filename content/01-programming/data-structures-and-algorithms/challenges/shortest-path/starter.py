from collections import deque


def shortest_path_length(graph, start, goal):
    """Return the fewest steps (edges) from `start` to `goal`, or -1 if `goal` cannot be reached.

    `graph` is a dict that maps a node to the list of nodes you can step to
    from it. Steps are one-way: if "a" lists "b", that does not mean "b" lists
    "a". A node that only appears in someone's list may have no entry of its
    own: it has no onward steps. The graph can contain loops.

    graph = {"a": ["b", "c"], "b": ["d"], "c": ["d"], "d": []}
    shortest_path_length(graph, "a", "d")  -> 2
    shortest_path_length(graph, "d", "a")  -> -1
    shortest_path_length(graph, "a", "a")  -> 0

    - A node is looked up in `graph` at most once. Do not copy, scan or change
      the whole graph: only look nodes up one at a time. (The tests check that
      the total number of lookups stays within the number of nodes.)
    - Do not use recursion: a path can be tens of thousands of steps long.
    """
    # TODO: explore the graph level by level with a queue (deque), remembering the nodes you have seen
    raise NotImplementedError("implement shortest_path_length")
