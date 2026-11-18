def merge_base(graph, a, b):
    """Find the best common ancestor of commits a and b.

    graph  a dict: commit id -> list of its parent ids, first parent first
           (an empty list for a root commit). It is not changed.
    a, b   commit ids that are keys of graph

    A commit counts as its own ancestor. So if a is an ancestor of b the answer
    is a, and merge_base(graph, a, a) is a.

    A common ancestor is "best" when it is not an ancestor of another common
    ancestor. This is what `git merge-base` looks for.

    - Unrelated histories (no common ancestor at all): return None.
    - Several best ancestors can exist (a criss-cross merge). Real git can print
      all of them with --all; this function returns the one that sorts first
      (smallest in plain string order).
    - An id that is not a key of graph raises KeyError with a message that
      contains the id. The same goes for a parent id that is missing from the
      graph when the search reaches it. Both a and b are checked, a first.
    - No recursion: a history of 100,000 commits in a line must work.
    - The ids are compared exactly (they are strings), and the result is the
      id itself.

    g = {"r": [], "x": ["r"], "y": ["r"]}
    merge_base(g, "x", "y")  -> "r"
    merge_base(g, "x", "r")  -> "r"
    """
    # TODO: collect the ancestors of a and of b (each includes itself), keep the
    # common ones, drop any that is an ancestor of another common one, then
    # return the smallest that is left. Use a loop with a stack, not recursion.
    raise NotImplementedError("implement merge_base")
