# Wrong: always uses h = 1e-5 and ignores the argument.
def numerical_gradient(f, x, h=1e-5):
    h = 1e-5
    grad = []
    for i in range(len(x)):
        plus = list(x); minus = list(x)
        plus[i] += h; minus[i] -= h
        grad.append((f(plus) - f(minus)) / (2 * h))
    return grad


def relative_error(a, b):
    if len(a) != len(b):
        raise ValueError("length")
    return max(abs(p - q) / max(abs(p), abs(q), 1e-12) for p, q in zip(a, b))
