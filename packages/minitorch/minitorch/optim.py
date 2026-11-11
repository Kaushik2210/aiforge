"""Optimisers: they read ``p.grad`` and move ``p.data``. Nothing more."""

from __future__ import annotations

from typing import Iterable

from .tensor import Tensor


class SGD:
    """Stochastic gradient descent, with optional momentum (v = mu*v + g; p -= lr*v)."""

    def __init__(self, params: Iterable[Tensor], lr: float = 0.1, momentum: float = 0.0) -> None:
        self.params = list(params)
        self.lr = lr
        self.momentum = momentum
        self._velocity: list[list[float]] = [[0.0] * len(p.data) for p in self.params]

    def zero_grad(self) -> None:
        for p in self.params:
            p.zero_grad()

    def step(self) -> None:
        for p, v in zip(self.params, self._velocity):
            if p.grad is None:
                continue
            for i, g in enumerate(p.grad):
                v[i] = self.momentum * v[i] + g
                p.data[i] -= self.lr * v[i]
