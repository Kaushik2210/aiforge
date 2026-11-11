"""A small n-dimensional tensor with reverse-mode automatic differentiation.

Written for reading. Pure Python, no NumPy, so it runs unchanged in the browser
(Pyodide) and anywhere else. It is slow on purpose-built-for-teaching sizes and
it mirrors PyTorch ideas; it is not PyTorch.

How it works
------------
Every operation computes its result and, if any input needs gradients, records
a small function that turns "gradient of the output" into "gradient of each
input" (the chain rule for that one operation). ``backward()`` walks those
records from the output back to the inputs, once each, in reverse order.
"""

from __future__ import annotations

import math
import random
from typing import Callable, Iterable, Sequence

Shape = tuple[int, ...]


# ---------------------------------------------------------------- shape helpers

def numel(shape: Shape) -> int:
    n = 1
    for s in shape:
        n *= s
    return n


def broadcast_shapes(a: Shape, b: Shape) -> Shape:
    """The shape two tensors broadcast to: align from the right, each pair of sizes must match or one be 1."""
    out: list[int] = []
    for i in range(1, max(len(a), len(b)) + 1):
        x = a[-i] if i <= len(a) else 1
        y = b[-i] if i <= len(b) else 1
        if x != y and x != 1 and y != 1:
            raise ValueError(f"cannot broadcast shapes {a} and {b}")
        out.append(max(x, y) if x != 0 and y != 0 else 0)
    return tuple(reversed(out))


def index_map(shape: Shape, out: Shape) -> list[int]:
    """For every position of a tensor of shape ``out`` (row-major), the position it reads in a tensor of ``shape``.

    ``shape`` must broadcast to ``out``. A size-1 (or missing) axis is read again and again.
    """
    nd = len(out)
    padded = (1,) * (nd - len(shape)) + tuple(shape)
    strides = [0] * nd
    run = 1
    for d in range(nd - 1, -1, -1):
        strides[d] = 0 if padded[d] == 1 else run
        run *= padded[d]
    idx = [0]
    for d in range(nd):
        step = strides[d]
        idx = [base + k * step for base in idx for k in range(out[d])]
    return idx


def _flatten(data: object) -> tuple[list[float], Shape]:
    if isinstance(data, (int, float)):
        return [float(data)], ()
    if not isinstance(data, (list, tuple)):
        raise TypeError(f"expected a number or a (nested) list, got {type(data).__name__}")
    if len(data) == 0:
        return [], (0,)
    parts = [_flatten(x) for x in data]
    shape = parts[0][1]
    if any(p[1] != shape for p in parts):
        raise ValueError("nested lists must be rectangular (every row the same length)")
    flat: list[float] = []
    for p in parts:
        flat.extend(p[0])
    return flat, (len(data),) + shape


def _nest(flat: Sequence[float], shape: Shape) -> object:
    if shape == ():
        return flat[0]
    if len(shape) == 1:
        return list(flat)
    step = numel(shape[1:])
    return [_nest(flat[i * step:(i + 1) * step], shape[1:]) for i in range(shape[0])]


# ------------------------------------------------------------------------ Tensor

class Tensor:
    """Numbers in a row-major list, plus a shape, plus (optionally) a gradient."""

    __slots__ = ("data", "shape", "requires_grad", "grad", "_parents", "_backward_fn", "_op")

    def __init__(self, data: object, requires_grad: bool = False, *, _shape: Shape | None = None) -> None:
        if _shape is not None:
            self.data: list[float] = data  # type: ignore[assignment]
            self.shape: Shape = _shape
        else:
            self.data, self.shape = _flatten(data)
        self.requires_grad = requires_grad
        self.grad: list[float] | None = None
        self._parents: tuple[Tensor, ...] = ()
        self._backward_fn: Callable[[list[float]], Sequence[list[float] | None]] | None = None
        self._op = ""

    # -- basics
    @property
    def ndim(self) -> int:
        return len(self.shape)

    def numel(self) -> int:
        return len(self.data)

    def item(self) -> float:
        if len(self.data) != 1:
            raise ValueError(f"item() needs a single value, this tensor has {len(self.data)}")
        return self.data[0]

    def tolist(self) -> object:
        return _nest(self.data, self.shape)

    def grad_tensor(self) -> "Tensor | None":
        return None if self.grad is None else Tensor(list(self.grad), _shape=self.shape)

    def detach(self) -> "Tensor":
        """The same numbers, cut off from the graph."""
        return Tensor(list(self.data), _shape=self.shape)

    def zero_grad(self) -> None:
        self.grad = None

    def __repr__(self) -> str:
        extra = ", requires_grad=True" if self.requires_grad else ""
        return f"Tensor({self.tolist()}{extra})"

    def __len__(self) -> int:
        if not self.shape:
            raise TypeError("len() of a 0-d tensor")
        return self.shape[0]

    # -- graph plumbing
    def _record(self, parents: Iterable["Tensor"], op: str, fn: Callable[[list[float]], Sequence[list[float] | None]]) -> "Tensor":
        ps = tuple(parents)
        if any(p.requires_grad for p in ps):
            self.requires_grad = True
            self._parents = ps
            self._backward_fn = fn
            self._op = op
        return self

    def backward(self, gradient: "Tensor | None" = None) -> None:
        """Fill ``.grad`` of every tensor that led to this one.

        With no argument this must be a single number (a loss); the starting gradient is 1.
        """
        if not self.requires_grad:
            raise RuntimeError("backward() on a tensor that does not require gradients")
        if gradient is None:
            if len(self.data) != 1:
                raise RuntimeError("backward() needs a gradient argument unless the tensor is a single number")
            seed = [1.0]
        else:
            if gradient.shape != self.shape:
                raise ValueError(f"gradient shape {gradient.shape} does not match {self.shape}")
            seed = list(gradient.data)

        order: list[Tensor] = []
        seen: set[int] = set()

        def visit(t: Tensor) -> None:  # iterative post-order: no recursion limit on deep graphs
            stack: list[tuple[Tensor, int]] = [(t, 0)]
            while stack:
                node, i = stack.pop()
                if i == 0:
                    if id(node) in seen:
                        continue
                    seen.add(id(node))
                if i < len(node._parents):
                    stack.append((node, i + 1))
                    stack.append((node._parents[i], 0))
                else:
                    order.append(node)

        visit(self)
        grads: dict[int, list[float]] = {id(self): seed}
        for node in reversed(order):
            g = grads.get(id(node))
            if g is None:
                continue
            if node._backward_fn is None:  # a leaf: keep the gradient
                if node.requires_grad:
                    node.grad = g if node.grad is None else [a + b for a, b in zip(node.grad, g)]
                continue
            for parent, pg in zip(node._parents, node._backward_fn(g)):
                if pg is None or not parent.requires_grad:
                    continue
                grads[id(parent)] = pg if id(parent) not in grads else [a + b for a, b in zip(grads[id(parent)], pg)]

    # -- elementwise arithmetic (with broadcasting)
    def _binary(self, other: "Tensor | float | int", op: str, f: Callable[[float, float], float],
                da: Callable[[float, float, float], float], db: Callable[[float, float, float], float]) -> "Tensor":
        o = other if isinstance(other, Tensor) else Tensor(float(other))
        shape = broadcast_shapes(self.shape, o.shape)
        ia, ib = index_map(self.shape, shape), index_map(o.shape, shape)
        a = [self.data[i] for i in ia]
        b = [o.data[i] for i in ib]
        out = Tensor([f(x, y) for x, y in zip(a, b)], _shape=shape)

        def back(g: list[float]) -> Sequence[list[float] | None]:
            ga = [gi * da(x, y, z) for gi, x, y, z in zip(g, a, b, out.data)] if self.requires_grad else None
            gb = [gi * db(x, y, z) for gi, x, y, z in zip(g, a, b, out.data)] if o.requires_grad else None
            return (_unbroadcast(ga, ia, self.shape), _unbroadcast(gb, ib, o.shape))

        return out._record((self, o), op, back)

    def __add__(self, other: "Tensor | float | int") -> "Tensor":
        return self._binary(other, "add", lambda x, y: x + y, lambda x, y, z: 1.0, lambda x, y, z: 1.0)

    __radd__ = __add__

    def __sub__(self, other: "Tensor | float | int") -> "Tensor":
        return self._binary(other, "sub", lambda x, y: x - y, lambda x, y, z: 1.0, lambda x, y, z: -1.0)

    def __rsub__(self, other: "Tensor | float | int") -> "Tensor":
        return (other if isinstance(other, Tensor) else Tensor(float(other))) - self

    def __mul__(self, other: "Tensor | float | int") -> "Tensor":
        return self._binary(other, "mul", lambda x, y: x * y, lambda x, y, z: y, lambda x, y, z: x)

    __rmul__ = __mul__

    def __truediv__(self, other: "Tensor | float | int") -> "Tensor":
        return self._binary(other, "div", lambda x, y: x / y, lambda x, y, z: 1.0 / y, lambda x, y, z: -x / (y * y))

    def __rtruediv__(self, other: "Tensor | float | int") -> "Tensor":
        return (other if isinstance(other, Tensor) else Tensor(float(other))) / self

    def __neg__(self) -> "Tensor":
        return self * -1.0

    def __pow__(self, p: float | int) -> "Tensor":
        if isinstance(p, Tensor):
            raise TypeError("only a plain number is supported as an exponent")
        p = float(p)
        out = Tensor([x ** p for x in self.data], _shape=self.shape)
        return out._record((self,), "pow", lambda g: [[gi * p * (x ** (p - 1.0)) for gi, x in zip(g, self.data)]])

    # -- elementwise functions
    def _unary(self, op: str, f: Callable[[float], float], df: Callable[[float, float], float]) -> "Tensor":
        out = Tensor([f(x) for x in self.data], _shape=self.shape)
        return out._record((self,), op, lambda g: [[gi * df(x, z) for gi, x, z in zip(g, self.data, out.data)]])

    def exp(self) -> "Tensor":
        return self._unary("exp", math.exp, lambda x, z: z)

    def log(self) -> "Tensor":
        return self._unary("log", math.log, lambda x, z: 1.0 / x)

    def tanh(self) -> "Tensor":
        return self._unary("tanh", math.tanh, lambda x, z: 1.0 - z * z)

    def sigmoid(self) -> "Tensor":
        def sig(x: float) -> float:  # stable for large negative and positive x
            return 1.0 / (1.0 + math.exp(-x)) if x >= 0 else math.exp(x) / (1.0 + math.exp(x))
        return self._unary("sigmoid", sig, lambda x, z: z * (1.0 - z))

    def relu(self) -> "Tensor":
        return self._unary("relu", lambda x: x if x > 0.0 else 0.0, lambda x, z: 1.0 if x > 0.0 else 0.0)

    # -- reductions
    def sum(self, axis: int | None = None, keepdims: bool = False) -> "Tensor":
        if axis is None:
            out = Tensor([math.fsum(self.data)], _shape=(1,) * self.ndim if keepdims else ())
            return out._record((self,), "sum", lambda g: [[g[0]] * len(self.data)])
        ax = axis + self.ndim if axis < 0 else axis
        if not 0 <= ax < self.ndim:
            raise ValueError(f"axis {axis} is out of range for a {self.ndim}-d tensor")
        kept = tuple(1 if d == ax else s for d, s in enumerate(self.shape))
        m = index_map(kept, self.shape)  # input position -> output position
        acc = [0.0] * numel(kept)
        for j, v in enumerate(self.data):
            acc[m[j]] += v
        final = kept if keepdims else tuple(s for d, s in enumerate(self.shape) if d != ax)
        out = Tensor(acc, _shape=final)
        return out._record((self,), "sum", lambda g: [[g[m[j]] for j in range(len(self.data))]])

    def mean(self, axis: int | None = None, keepdims: bool = False) -> "Tensor":
        count = len(self.data) if axis is None else self.shape[axis]
        return self.sum(axis, keepdims) / float(count)

    # -- shape changes
    def reshape(self, *shape: int) -> "Tensor":
        new = tuple(shape[0]) if len(shape) == 1 and isinstance(shape[0], (tuple, list)) else tuple(shape)
        if -1 in new:
            known = numel(tuple(s for s in new if s != -1))
            new = tuple(len(self.data) // known if s == -1 else s for s in new)
        if numel(new) != len(self.data):
            raise ValueError(f"cannot reshape {len(self.data)} values into {new}")
        out = Tensor(list(self.data), _shape=new)
        return out._record((self,), "reshape", lambda g: [list(g)])

    @property
    def T(self) -> "Tensor":
        if self.ndim != 2:
            raise ValueError("`.T` is for 2-d tensors")
        r, c = self.shape
        out = Tensor([self.data[i * c + j] for j in range(c) for i in range(r)], _shape=(c, r))
        return out._record((self,), "T", lambda g: [[g[j * r + i] for i in range(r) for j in range(c)]])

    def matmul(self, other: "Tensor") -> "Tensor":
        if self.ndim != 2 or other.ndim != 2:
            raise ValueError(f"matmul needs two 2-d tensors, got {self.shape} and {other.shape} (use reshape for vectors)")
        n, k = self.shape
        k2, m = other.shape
        if k != k2:
            raise ValueError(f"matmul shapes do not fit: {self.shape} @ {other.shape}")
        out = Tensor(_mm(self.data, other.data, n, k, m), _shape=(n, m))

        def back(g: list[float]) -> Sequence[list[float] | None]:
            ga = _mm(g, _t(other.data, k, m), n, m, k) if self.requires_grad else None  # G @ B^T
            gb = _mm(_t(self.data, n, k), g, k, n, m) if other.requires_grad else None  # A^T @ G
            return (ga, gb)

        return out._record((self, other), "matmul", back)

    __matmul__ = matmul


def _mm(a: list[float], b: list[float], n: int, k: int, m: int) -> list[float]:
    out = [0.0] * (n * m)
    for i in range(n):
        for p in range(k):
            av = a[i * k + p]
            if av == 0.0:
                continue
            row = p * m
            base = i * m
            for j in range(m):
                out[base + j] += av * b[row + j]
    return out


def _t(a: list[float], r: int, c: int) -> list[float]:
    return [a[i * c + j] for j in range(c) for i in range(r)]


def _unbroadcast(g: list[float] | None, idx: list[int], shape: Shape) -> list[float] | None:
    """Add the gradient back up to the smaller shape that was stretched by broadcasting."""
    if g is None:
        return None
    if len(idx) == numel(shape) and idx == list(range(len(idx))):
        return g
    out = [0.0] * numel(shape)
    for j, v in enumerate(g):
        out[idx[j]] += v
    return out


# ------------------------------------------------------------------ constructors

def tensor(data: object, requires_grad: bool = False) -> Tensor:
    return Tensor(data, requires_grad)


def zeros(*shape: int, requires_grad: bool = False) -> Tensor:
    s = tuple(shape[0]) if len(shape) == 1 and isinstance(shape[0], (tuple, list)) else tuple(shape)
    return Tensor([0.0] * numel(s), requires_grad, _shape=s)


def ones(*shape: int, requires_grad: bool = False) -> Tensor:
    s = tuple(shape[0]) if len(shape) == 1 and isinstance(shape[0], (tuple, list)) else tuple(shape)
    return Tensor([1.0] * numel(s), requires_grad, _shape=s)


def randn(*shape: int, seed: int = 0, requires_grad: bool = False) -> Tensor:
    """Standard-normal numbers from a seeded generator, so examples are repeatable."""
    s = tuple(shape[0]) if len(shape) == 1 and isinstance(shape[0], (tuple, list)) else tuple(shape)
    rng = random.Random(seed)
    return Tensor([rng.gauss(0.0, 1.0) for _ in range(numel(s))], requires_grad, _shape=s)
