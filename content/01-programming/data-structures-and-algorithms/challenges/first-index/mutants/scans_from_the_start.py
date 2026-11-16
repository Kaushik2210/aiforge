# Wrong: a linear scan, which reads every item up to the match.
def first_index(items, target):
    for i in range(len(items)):
        if items[i] == target:
            return i
    return -1
