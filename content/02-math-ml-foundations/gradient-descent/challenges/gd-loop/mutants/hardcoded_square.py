# Wrong: ignores the gradient function and assumes f(x) = x^2.
def gradient_descent(grad, x0, lr, steps):
    xs = [x0]
    for _ in range(steps):
        xs.append(xs[-1] * (1 - 2 * lr))
    return xs
