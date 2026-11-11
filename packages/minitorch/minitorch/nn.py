"""Layers and losses built from Tensor operations. Nothing here knows about gradients:
the autograd in tensor.py does all of that."""

from __future__ import annotations

import math
from typing import Iterable

from .tensor import Tensor, randn


class Module:
    """Anything with parameters. Subclasses implement ``forward``."""

    def parameters(self) -> list[Tensor]:
        found: list[Tensor] = []
        for value in vars(self).values():
            if isinstance(value, Tensor) and value.requires_grad:
                found.append(value)
            elif isinstance(value, Module):
                found.extend(value.parameters())
            elif isinstance(value, (list, tuple)):
                for item in value:
                    if isinstance(item, Module):
                        found.extend(item.parameters())
        return found

    def zero_grad(self) -> None:
        for p in self.parameters():
            p.zero_grad()

    def forward(self, x: Tensor) -> Tensor:
        raise NotImplementedError

    def __call__(self, x: Tensor) -> Tensor:
        return self.forward(x)


class Linear(Module):
    """y = x @ W + b, with W of shape (in, out). Weights start small and random (scaled by 1/sqrt(in))."""

    def __init__(self, n_in: int, n_out: int, seed: int = 0) -> None:
        scale = 1.0 / math.sqrt(n_in)
        self.weight = randn(n_in, n_out, seed=seed) * scale
        self.weight.requires_grad = True
        self.bias = Tensor([0.0] * n_out, True, _shape=(n_out,))

    def forward(self, x: Tensor) -> Tensor:
        return x @ self.weight + self.bias


class ReLU(Module):
    def forward(self, x: Tensor) -> Tensor:
        return x.relu()


class Tanh(Module):
    def forward(self, x: Tensor) -> Tensor:
        return x.tanh()


class Sequential(Module):
    def __init__(self, *layers: Module) -> None:
        self.layers = list(layers)

    def forward(self, x: Tensor) -> Tensor:
        for layer in self.layers:
            x = layer(x)
        return x


def mse_loss(pred: Tensor, target: Tensor) -> Tensor:
    """Mean of squared differences."""
    return ((pred - target) ** 2).mean()


def log_softmax(x: Tensor) -> Tensor:
    """Row-wise log-softmax of a 2-d tensor, computed with the max subtracted so large logits do not overflow."""
    if x.ndim != 2:
        raise ValueError("log_softmax expects a 2-d tensor (rows are examples)")
    shift = Tensor([max(x.data[i * x.shape[1]:(i + 1) * x.shape[1]]) for i in range(x.shape[0])], _shape=(x.shape[0], 1))
    z = x - shift  # the shift is a constant: it changes nothing mathematically
    return z - z.exp().sum(axis=1, keepdims=True).log()


def cross_entropy(logits: Tensor, targets: Iterable[int]) -> Tensor:
    """Mean negative log-probability of the correct class. ``targets`` are class numbers, one per row."""
    t = list(targets)
    n, c = logits.shape
    if len(t) != n or any(not 0 <= k < c for k in t):
        raise ValueError("targets must be one class number in [0, classes) per row")
    onehot = Tensor([1.0 if j == t[i] else 0.0 for i in range(n) for j in range(c)], _shape=(n, c))
    return -(log_softmax(logits) * onehot).sum() / float(n)
