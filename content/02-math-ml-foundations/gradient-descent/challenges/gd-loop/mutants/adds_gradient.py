# Wrong: gradient ascent (sign flipped).
def gradient_descent(grad, x0, lr, steps):
    xs = [x0]
    x = x0
    for _ in range(steps):
        x = x + lr * grad(x)
        xs.append(x)
    return xs
