def numerical_gradient(f, x, h=1e-5):
    """Centered-difference gradient estimate at x (list of floats)."""
    grad = []
    for i in range(len(x)):
        plus = list(x)
        minus = list(x)
        plus[i] += h
        minus[i] -= h
        grad.append((f(plus) - f(minus)) / (2 * h))
    return grad


def relative_error(a, b):
    """Largest per-coordinate relative difference between two gradients."""
    if len(a) != len(b):
        raise ValueError("gradients must have the same length")
    worst = 0.0
    for p, q in zip(a, b):
        denom = max(abs(p), abs(q), 1e-12)
        worst = max(worst, abs(p - q) / denom)
    return worst
