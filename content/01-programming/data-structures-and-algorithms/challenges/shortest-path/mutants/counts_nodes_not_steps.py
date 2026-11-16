# Wrong: off by one, counts the nodes on the path rather than the steps.
from collections import deque


def shortest_path_length(graph, start, goal):
    seen = {start}
    queue = deque([(start, 1)])
    while queue:
        node, count = queue.popleft()
        if node == goal:
            return count
        for neighbour in graph.get(node, ()):
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append((neighbour, count + 1))
    return -1
