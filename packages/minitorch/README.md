# minitorch

A small tensor and reverse-mode autograd library with a PyTorch-flavoured API,
written to be read. It mirrors PyTorch ideas; it is not PyTorch, and it is far
too slow for real models.

**Pure Python, no NumPy.** That keeps it importable in the browser (Pyodide)
without loading extra packages, and keeps every line of the maths visible.

```python
import minitorch as mt

w = mt.tensor([[0.5], [-1.0]], requires_grad=True)
x = mt.tensor([[1.0, 2.0], [3.0, 4.0]])
loss = ((x @ w) ** 2).mean()
loss.backward()
print(w.grad)          # gradient of the loss with respect to w
mt.grad_check(lambda w: ((x @ w) ** 2).mean(), [w])   # compare with nudging w
```

## What is in it

| Piece | File | Notes |
|---|---|---|
| `Tensor` | `minitorch/tensor.py` | n-d, row-major list; broadcasting; `+ - * / ** @`, `exp log tanh sigmoid relu`, `sum mean` (with axis), `reshape`, `.T` |
| autograd | `Tensor.backward` | records one small function per operation, then walks the graph backwards once each (iterative, so deep graphs are fine) |
| layers | `minitorch/nn.py` | `Linear`, `ReLU`, `Tanh`, `Sequential`, `mse_loss`, `log_softmax`, `cross_entropy` |
| optimiser | `minitorch/optim.py` | `SGD` with optional momentum |
| checker | `minitorch/gradcheck.py` | central differences against autograd |

## Deliberate limits

- 2-d matrix multiply only (reshape vectors first); no batching of matmul.
- No GPU, no dtype other than Python floats, no in-place operations.
- `Tensor.grad` is a plain list of floats (use `grad_tensor()` for a Tensor).
- Gradients accumulate until `zero_grad()`, like PyTorch.
- The gradient of ReLU at exactly 0 is 0 (a convention; PyTorch does the same).

## Tests

```bash
pnpm minitorch:test      # python -m unittest; also part of pnpm verify
```

They check every operation against numerical gradients, broadcasting, graphs
that reuse a tensor, a 3000-deep graph, learning (a line, XOR), a stable
softmax, and (if NumPy is installed) 30 random expressions against NumPy. The
same tests also run inside real Pyodide from `packages/runner`.

Design inspiration: Karpathy's micrograd (scalar autograd, MIT). Concepts follow
the PyTorch autograd notes. No code was copied from either.
