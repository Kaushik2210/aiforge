# Wrong: slices the sequence at every step, which copies items (and is not the O(log n) work asked for).
def first_index(items, target):
    offset = 0
    window = items
    while len(window) > 1:
        mid = len(window) // 2
        if window[mid] < target:
            offset += mid
            window = window[mid:]
        else:
            window = window[:mid]
    if len(window) == 1 and window[0] == target:
        return offset
    return -1
