# Wrong: one-sided difference (error proportional to h).
def numerical_gradient(f, x, h=1e-5):
    grad = []
    for i in range(len(x)):
        plus = list(x)
        plus[i] += h
        grad.append((f(plus) - f(x)) / h)
    return grad


def relative_error(a, b):
    if len(a) != len(b):
        raise ValueError("length")
    return max(abs(p - q) / max(abs(p), abs(q), 1e-12) for p, q in zip(a, b))
