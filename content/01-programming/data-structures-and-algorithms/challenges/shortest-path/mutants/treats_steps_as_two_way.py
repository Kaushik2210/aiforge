# Wrong: also walks edges backwards.
from collections import deque


def shortest_path_length(graph, start, goal):
    back = {}
    for a, outs in graph.items():
        for b in outs:
            back.setdefault(b, []).append(a)
    if start == goal:
        return 0
    seen = {start}
    queue = deque([(start, 0)])
    while queue:
        node, steps = queue.popleft()
        for neighbour in list(graph.get(node, ())) + back.get(node, []):
            if neighbour == goal:
                return steps + 1
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append((neighbour, steps + 1))
    return -1
