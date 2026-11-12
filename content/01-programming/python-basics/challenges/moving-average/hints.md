1. The first window starts at index 0 and the last full window starts at `len(values) - window`. A list of 5 values and a window of 2 has 4 windows.
2. `values[i:i + window]` gives the slice for the window that starts at `i`; `sum(...) / window` is its average.
3. Check `window < 1` first and raise `ValueError`. When the window is too long, `range` of a negative number is simply empty, so the loop produces `[]` without a special case.
