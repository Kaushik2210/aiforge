# Wrong: looks at the first item before checking there is one.
def first_index(items, target):
    if items[0] > target:
        return -1
    lo, hi = 0, len(items)
    while lo < hi:
        mid = (lo + hi) // 2
        if items[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    if lo < len(items) and items[lo] == target:
        return lo
    return -1
