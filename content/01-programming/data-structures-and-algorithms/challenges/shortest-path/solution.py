from collections import deque


def shortest_path_length(graph, start, goal):
    if start == goal:
        return 0
    seen = {start}
    queue = deque([(start, 0)])
    while queue:
        node, steps = queue.popleft()
        for neighbour in graph.get(node, ()):
            if neighbour == goal:
                return steps + 1
            if neighbour not in seen:
                seen.add(neighbour)
                queue.append((neighbour, steps + 1))
    return -1
