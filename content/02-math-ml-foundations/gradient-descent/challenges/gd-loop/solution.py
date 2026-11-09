def gradient_descent(grad, x0, lr, steps):
    """Run plain gradient descent on a single variable.

    Returns every iterate, starting with x0 (steps + 1 entries).
    """
    xs = [x0]
    x = x0
    for _ in range(steps):
        x = x - lr * grad(x)
        xs.append(x)
    return xs
