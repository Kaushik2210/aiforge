def numerical_gradient(f, x, h=1e-5):
    """Estimate the gradient of f at point x (a list of floats).

    Use the centered difference (f(x + h) - f(x - h)) / (2h) for each
    coordinate separately. Return a list the same length as x.
    """
    # TODO: perturb one coordinate at a time, in both directions
    raise NotImplementedError("implement numerical_gradient")


def relative_error(a, b):
    """Largest relative difference between two gradient lists.

    For each pair use |a - b| / max(|a|, |b|, 1e-12). Raise ValueError if
    the lists have different lengths.
    """
    # TODO
    raise NotImplementedError("implement relative_error")
