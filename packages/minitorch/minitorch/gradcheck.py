"""Check autograd against the definition of a derivative: nudge each input a little and see how the output moves."""

from __future__ import annotations

from typing import Callable, Sequence

from .tensor import Tensor


def numerical_grad(f: Callable[..., Tensor], inputs: Sequence[Tensor], index: int, eps: float = 1e-5) -> list[float]:
    """Central differences (f(x+eps) - f(x-eps)) / 2eps for every number in ``inputs[index]``."""
    x = inputs[index]
    out: list[float] = []
    for i in range(len(x.data)):
        original = x.data[i]
        x.data[i] = original + eps
        hi = f(*inputs).item()
        x.data[i] = original - eps
        lo = f(*inputs).item()
        x.data[i] = original
        out.append((hi - lo) / (2.0 * eps))
    return out


def grad_check(f: Callable[..., Tensor], inputs: Sequence[Tensor], eps: float = 1e-5, tol: float = 1e-4) -> float:
    """Return the worst relative error between autograd and numerical gradients; raise if it exceeds ``tol``.

    ``f`` must return a single number. Every input should have ``requires_grad=True``.
    """
    for t in inputs:
        t.zero_grad()
    f(*inputs).backward()
    worst = 0.0
    for k, t in enumerate(inputs):
        if not t.requires_grad:
            continue
        analytic = t.grad if t.grad is not None else [0.0] * len(t.data)
        numeric = numerical_grad(f, inputs, k, eps)
        for a, n in zip(analytic, numeric):
            err = abs(a - n) / max(1.0, abs(a), abs(n))
            worst = max(worst, err)
    if worst > tol:
        raise AssertionError(f"gradient check failed: worst relative error {worst:.3g} > {tol}")
    return worst
