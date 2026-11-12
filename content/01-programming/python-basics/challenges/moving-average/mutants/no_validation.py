# Wrong: never checks the window, so 0 gives ZeroDivisionError instead of ValueError.
def moving_average(values, window):
    return [sum(values[i:i + window]) / window for i in range(len(values) - window + 1)]
