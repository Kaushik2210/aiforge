# Wrong: forgets to include the starting point.
def gradient_descent(grad, x0, lr, steps):
    xs = []
    x = x0
    for _ in range(steps):
        x = x - lr * grad(x)
        xs.append(x)
    return xs
