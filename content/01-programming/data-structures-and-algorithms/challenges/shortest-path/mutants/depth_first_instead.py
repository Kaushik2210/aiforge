# Wrong: depth first finds A route, not the shortest one.
def shortest_path_length(graph, start, goal):
    seen = set()
    stack = [(start, 0)]
    while stack:
        node, steps = stack.pop()
        if node == goal:
            return steps
        if node in seen:
            continue
        seen.add(node)
        for neighbour in graph.get(node, ()):
            stack.append((neighbour, steps + 1))
    return -1
