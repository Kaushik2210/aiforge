# Wrong: the window ends one item early, so the final item can never be found.
def first_index(items, target):
    lo, hi = 0, len(items) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    if lo < len(items) - 1 and items[lo] == target:
        return lo
    return -1
