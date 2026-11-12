# Wrong: sorts the caller's list in place.
def moving_average(values, window):
    if window < 1:
        raise ValueError("window must be at least 1")
    if isinstance(values, list):
        values.sort()
    return [sum(values[i:i + window]) / window for i in range(len(values) - window + 1)]
