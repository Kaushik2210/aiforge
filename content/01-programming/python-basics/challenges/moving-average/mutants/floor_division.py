# Wrong: // throws away the fraction.
def moving_average(values, window):
    if window < 1:
        raise ValueError("window must be at least 1")
    return [sum(values[i:i + window]) // window for i in range(len(values) - window + 1)]
