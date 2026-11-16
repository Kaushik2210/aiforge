1. Keep a window `lo` to `hi` (with `hi` one past the last candidate). Look at the middle item: if it is smaller than the target, the answer is to the right of it; otherwise the answer is at the middle or to its left.
2. Because you want the FIRST match, when the middle item is equal to the target do not stop: keep the middle in the window (`hi = mid`) and keep halving until the window is empty.
3. When the window closes, `lo` is the first position whose item is not smaller than the target. It is the answer only if it is inside the sequence and equal to the target; otherwise return -1.
