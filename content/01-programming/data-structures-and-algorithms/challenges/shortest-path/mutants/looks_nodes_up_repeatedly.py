# Wrong: looks a node up once per time it is reached, not once overall (re-queues seen nodes it has not expanded yet).
from collections import deque


def shortest_path_length(graph, start, goal):
    if start == goal:
        return 0
    queue = deque([(start, 0)])
    expanded = set()
    while queue:
        node, steps = queue.popleft()
        if node == goal:
            return steps
        neighbours = graph.get(node, ())
        if node in expanded:
            continue
        expanded.add(node)
        for neighbour in neighbours:
            queue.append((neighbour, steps + 1))
    return -1
