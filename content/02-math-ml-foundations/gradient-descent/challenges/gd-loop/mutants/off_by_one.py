# Wrong: one step too few.
def gradient_descent(grad, x0, lr, steps):
    xs = [x0]
    x = x0
    for _ in range(steps - 1):
        x = x - lr * grad(x)
        xs.append(x)
    return xs
