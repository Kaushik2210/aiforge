# Wrong: finds the last equal item instead of the first.
def first_index(items, target):
    lo, hi = 0, len(items)
    while lo < hi:
        mid = (lo + hi) // 2
        if items[mid] <= target:
            lo = mid + 1
        else:
            hi = mid
    if lo > 0 and items[lo - 1] == target:
        return lo - 1
    return -1
