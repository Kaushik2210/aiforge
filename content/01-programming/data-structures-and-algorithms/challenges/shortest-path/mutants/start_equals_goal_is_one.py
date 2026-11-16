# Wrong: reports 1 step when you are already there.
from collections import deque


def shortest_path_length(graph, start, goal):
    seen = {start}
    queue = deque([(start, 0)])
    if start == goal:
        return 1
    while queue:
        node, steps = queue.popleft()
        for neighbour in graph.get(node, ()):
            if neighbour == goal:
                return steps + 1
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append((neighbour, steps + 1))
    return -1
