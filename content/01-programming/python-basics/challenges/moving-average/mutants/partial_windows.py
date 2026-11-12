# Wrong: keeps the short windows at the end of the list.
def moving_average(values, window):
    if window < 1:
        raise ValueError("window must be at least 1")
    return [sum(values[i:i + window]) / len(values[i:i + window]) for i in range(len(values))]
