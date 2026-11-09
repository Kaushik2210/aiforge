1. Keep a running value `x` and a list that starts as `[x0]`.
2. Each step moves *against* the gradient: the new x is the old x minus the learning rate times the gradient at the old x.
3. Append the new x to the list after every step and return the list at the end.
