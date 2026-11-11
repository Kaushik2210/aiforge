import math
import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import minitorch as mt
from minitorch import nn, optim
from minitorch.tensor import broadcast_shapes, index_map

try:
    import numpy as np
except ImportError:  # the oracle test is skipped without NumPy
    np = None


def rnd(shape, seed, lo=-2.0, hi=2.0, grad=True):
    rng = random.Random(seed)
    n = 1
    for s in shape:
        n *= s
    return mt.Tensor([rng.uniform(lo, hi) for _ in range(n)], grad, _shape=tuple(shape))


class Shapes(unittest.TestCase):
    def test_construct_and_tolist(self):
        t = mt.tensor([[1, 2, 3], [4, 5, 6]])
        self.assertEqual(t.shape, (2, 3))
        self.assertEqual(t.tolist(), [[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
        self.assertEqual(mt.tensor(3).shape, ())

    def test_ragged_input_rejected(self):
        with self.assertRaises(ValueError):
            mt.tensor([[1, 2], [3]])

    def test_broadcast_shapes(self):
        self.assertEqual(broadcast_shapes((3, 1), (1, 4)), (3, 4))
        self.assertEqual(broadcast_shapes((4,), (2, 3, 4)), (2, 3, 4))
        self.assertEqual(broadcast_shapes((), (2, 2)), (2, 2))
        with self.assertRaises(ValueError):
            broadcast_shapes((3,), (4,))

    def test_index_map(self):
        self.assertEqual(index_map((2, 1), (2, 3)), [0, 0, 0, 1, 1, 1])
        self.assertEqual(index_map((3,), (2, 3)), [0, 1, 2, 0, 1, 2])

    def test_reshape_and_transpose(self):
        t = mt.tensor([[1, 2, 3], [4, 5, 6]])
        self.assertEqual(t.reshape(3, 2).tolist(), [[1, 2], [3, 4], [5, 6]])
        self.assertEqual(t.reshape(-1).shape, (6,))
        self.assertEqual(t.T.tolist(), [[1, 4], [2, 5], [3, 6]])
        with self.assertRaises(ValueError):
            t.reshape(4, 2)


class Values(unittest.TestCase):
    def test_arithmetic(self):
        a, b = mt.tensor([1.0, 2.0, 3.0]), mt.tensor([4.0, 5.0, 6.0])
        self.assertEqual((a + b).tolist(), [5, 7, 9])
        self.assertEqual((b - a).tolist(), [3, 3, 3])
        self.assertEqual((a * b).tolist(), [4, 10, 18])
        self.assertEqual((b / a).tolist(), [4, 2.5, 2])
        self.assertEqual((2 - a).tolist(), [1, 0, -1])
        self.assertEqual((1 / a).tolist(), [1, 0.5, 1 / 3])
        self.assertEqual((a ** 2).tolist(), [1, 4, 9])
        self.assertEqual((-a).tolist(), [-1, -2, -3])

    def test_broadcast_add(self):
        m = mt.tensor([[1.0, 2.0], [3.0, 4.0]])
        self.assertEqual((m + mt.tensor([10.0, 20.0])).tolist(), [[11, 22], [13, 24]])
        self.assertEqual((m * mt.tensor([[1.0], [10.0]])).tolist(), [[1, 2], [30, 40]])

    def test_matmul_values(self):
        a = mt.tensor([[1.0, 2.0], [3.0, 4.0]])
        b = mt.tensor([[5.0, 6.0], [7.0, 8.0]])
        self.assertEqual((a @ b).tolist(), [[19, 22], [43, 50]])
        with self.assertRaises(ValueError):
            a @ mt.tensor([[1.0, 2.0, 3.0]])

    def test_reductions(self):
        m = mt.tensor([[1.0, 2.0, 3.0], [4.0, 5.0, 6.0]])
        self.assertEqual(m.sum().item(), 21)
        self.assertEqual(m.sum(axis=0).tolist(), [5, 7, 9])
        self.assertEqual(m.sum(axis=1).tolist(), [6, 15])
        self.assertEqual(m.sum(axis=1, keepdims=True).shape, (2, 1))
        self.assertEqual(m.sum(axis=-1).tolist(), [6, 15])
        self.assertEqual(m.mean().item(), 3.5)
        self.assertEqual(m.mean(axis=0).tolist(), [2.5, 3.5, 4.5])

    def test_functions(self):
        x = mt.tensor([-1.0, 0.0, 2.0])
        self.assertEqual(x.relu().tolist(), [0, 0, 2])
        self.assertAlmostEqual(x.tanh().data[2], math.tanh(2.0))
        self.assertAlmostEqual(x.sigmoid().data[1], 0.5)
        self.assertAlmostEqual(x.exp().data[0], math.exp(-1.0))

    def test_relu_gradient_is_zero_at_exactly_zero(self):
        x = mt.tensor([0.0], True)
        x.relu().sum().backward()
        self.assertEqual(x.grad, [0.0])

    def test_sigmoid_is_stable(self):
        s = mt.tensor([-1000.0, 1000.0]).sigmoid().tolist()
        self.assertEqual(s, [0.0, 1.0])

    def test_no_graph_without_requires_grad(self):
        y = (mt.tensor([1.0]) * 3.0).relu()
        self.assertFalse(y.requires_grad)
        with self.assertRaises(RuntimeError):
            y.backward()


class Gradients(unittest.TestCase):
    """Every operation, checked against nudging the inputs."""

    def check(self, f, *shapes, lo=-2.0, hi=2.0):
        ins = [rnd(s, 7 + i, lo, hi) for i, s in enumerate(shapes)]
        self.assertLess(mt.grad_check(f, ins), 1e-6)

    def test_add_sub_mul_div(self):
        self.check(lambda a, b: (a + b).sum(), (2, 3), (2, 3))
        self.check(lambda a, b: (a - b * 2.0).sum(), (2, 3), (2, 3))
        self.check(lambda a, b: (a * b).sum(), (2, 3), (2, 3))
        self.check(lambda a, b: (a / b).sum(), (2, 3), (2, 3), lo=0.5, hi=2.0)

    def test_broadcasting_gradients_sum_back(self):
        self.check(lambda a, b: (a + b).sum(), (3, 4), (4,))
        self.check(lambda a, b: (a * b).sum(), (3, 1), (1, 4))
        self.check(lambda a, b: (a * b).tanh().sum(), (2, 3, 4), (3, 1))
        self.check(lambda a, b: (a - b).sum(), (2, 3), ())

    def test_pow_exp_log_tanh_sigmoid_relu(self):
        self.check(lambda a: (a ** 3).sum(), (4,))
        self.check(lambda a: (a ** 0.5).sum(), (4,), lo=0.5, hi=3.0)
        self.check(lambda a: a.exp().sum(), (4,))
        self.check(lambda a: a.log().sum(), (4,), lo=0.5, hi=3.0)
        self.check(lambda a: a.tanh().sum(), (4,))
        self.check(lambda a: a.sigmoid().sum(), (4,))
        self.check(lambda a: (a.relu() * 2.0).sum(), (6,), lo=0.2, hi=2.0)

    def test_matmul(self):
        self.check(lambda a, b: (a @ b).tanh().sum(), (3, 4), (4, 2))
        self.check(lambda a, b: ((a @ b) ** 2).mean(), (1, 5), (5, 3))

    def test_sum_axes_and_mean(self):
        self.check(lambda a: (a.sum(axis=0) ** 2).sum(), (3, 4))
        self.check(lambda a: (a.sum(axis=1, keepdims=True) * a).sum(), (3, 4))
        self.check(lambda a: (a.mean(axis=-1) ** 2).sum(), (2, 3, 4))
        self.check(lambda a: a.mean() ** 2, (3, 4))

    def test_reshape_and_transpose(self):
        self.check(lambda a, b: (a.reshape(4, 3) @ b).sum(), (3, 4), (3, 2))
        self.check(lambda a, b: (a.T * b).tanh().sum(), (3, 4), (4, 3))

    def test_same_tensor_used_twice_accumulates(self):
        x = mt.tensor([3.0], True)
        (x * x).sum().backward()  # d(x^2)/dx = 2x
        self.assertEqual(x.grad, [6.0])

    def test_diamond_graph(self):
        x = mt.tensor([2.0], True)
        a = x * 3.0
        b = x * 5.0
        (a * b).sum().backward()  # 15 x^2 -> 30 x
        self.assertEqual(x.grad, [60.0])

    def test_gradients_accumulate_until_zeroed(self):
        x = mt.tensor([1.0, 2.0], True)
        (x * 2.0).sum().backward()
        (x * 2.0).sum().backward()
        self.assertEqual(x.grad, [4.0, 4.0])
        x.zero_grad()
        self.assertIsNone(x.grad)

    def test_deep_graph_does_not_hit_the_recursion_limit(self):
        x = mt.tensor([1.0], True)
        y = x
        for _ in range(3000):
            y = y * 1.0001
        y.sum().backward()
        self.assertAlmostEqual(x.grad[0], 1.0001 ** 3000, places=6)

    def test_constants_get_no_gradient(self):
        w = mt.tensor([1.0, 2.0], True)
        c = mt.tensor([5.0, 5.0])
        (w * c).sum().backward()
        self.assertEqual(w.grad, [5.0, 5.0])
        self.assertIsNone(c.grad)

    def test_backward_needs_a_scalar_or_a_seed(self):
        x = mt.tensor([1.0, 2.0], True)
        with self.assertRaises(RuntimeError):
            (x * 2.0).backward()
        (x * 2.0).backward(mt.tensor([1.0, 10.0]))
        self.assertEqual(x.grad, [2.0, 20.0])

    def test_grad_check_catches_a_wrong_gradient(self):
        x = mt.tensor([1.0, 2.0], True)

        def bad(t):
            out = mt.Tensor([v * v for v in t.data], _shape=t.shape)
            # the true derivative is 2v; this deliberately says 3v
            return out._record((t,), "bad", lambda g: [[gi * 3.0 * v for gi, v in zip(g, t.data)]]).sum()

        with self.assertRaises(AssertionError):
            mt.grad_check(bad, [x])


@unittest.skipIf(np is None, "NumPy not installed")
class AgainstNumpy(unittest.TestCase):
    def test_random_expressions_match_numpy(self):
        rng = np.random.default_rng(0)
        for _ in range(30):
            n, k, m = (int(v) for v in rng.integers(1, 5, size=3))
            A, B, bias = rng.normal(size=(n, k)), rng.normal(size=(k, m)), rng.normal(size=(m,))
            ta, tb, tbias = (mt.tensor(v.tolist(), True) for v in (A, B, bias))
            out = ((ta @ tb + tbias).tanh() ** 2).mean()
            out.backward()
            Z = A @ B + bias
            T = np.tanh(Z)
            dZ = 2 * T * (1 - T ** 2) / T.size
            self.assertAlmostEqual(out.item(), float((T ** 2).mean()), places=9)
            np.testing.assert_allclose(np.array(ta.grad).reshape(n, k), dZ @ B.T, atol=1e-9)
            np.testing.assert_allclose(np.array(tb.grad).reshape(k, m), A.T @ dZ, atol=1e-9)
            np.testing.assert_allclose(np.array(tbias.grad), dZ.sum(axis=0), atol=1e-9)


class Learning(unittest.TestCase):
    def test_sgd_fits_a_line(self):
        xs = mt.tensor([[0.0], [1.0], [2.0], [3.0]])
        ys = mt.tensor([[1.0], [3.0], [5.0], [7.0]])  # y = 2x + 1
        model = nn.Linear(1, 1)
        opt = optim.SGD(model.parameters(), lr=0.05)
        for _ in range(400):
            opt.zero_grad()
            nn.mse_loss(model(xs), ys).backward()
            opt.step()
        self.assertAlmostEqual(model.weight.data[0], 2.0, places=2)
        self.assertAlmostEqual(model.bias.data[0], 1.0, places=2)

    def test_mlp_learns_xor(self):
        xs = mt.tensor([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]])
        ys = mt.tensor([[0.0], [1.0], [1.0], [0.0]])
        model = nn.Sequential(nn.Linear(2, 8, seed=1), nn.Tanh(), nn.Linear(8, 1, seed=2))
        opt = optim.SGD(model.parameters(), lr=0.3, momentum=0.8)
        first = nn.mse_loss(model(xs), ys).item()
        for _ in range(500):
            opt.zero_grad()
            nn.mse_loss(model(xs), ys).backward()
            opt.step()
        last = nn.mse_loss(model(xs), ys).item()
        self.assertLess(last, 0.02)
        self.assertLess(last, first / 10)
        self.assertEqual([round(v) for v in model(xs).data], [0, 1, 1, 0])

    def test_parameters_are_found_inside_nested_modules(self):
        model = nn.Sequential(nn.Linear(2, 3), nn.ReLU(), nn.Linear(3, 1))
        self.assertEqual(len(model.parameters()), 4)

    def test_momentum_moves_further_than_plain_sgd_on_a_steady_gradient(self):
        def run(momentum):
            p = mt.tensor([0.0], True)
            opt = optim.SGD([p], lr=0.1, momentum=momentum)
            for _ in range(5):
                opt.zero_grad()
                (p * -1.0).sum().backward()  # constant gradient of -1
                opt.step()
            return p.data[0]

        self.assertGreater(run(0.9), run(0.0))
        self.assertAlmostEqual(run(0.0), 0.5)


class Classification(unittest.TestCase):
    def test_log_softmax_rows_sum_to_one_in_probability(self):
        out = nn.log_softmax(mt.tensor([[1.0, 2.0, 3.0], [0.0, 0.0, 0.0]]))
        for r in range(2):
            self.assertAlmostEqual(sum(math.exp(v) for v in out.data[r * 3:(r + 1) * 3]), 1.0)

    def test_log_softmax_survives_huge_logits(self):
        out = nn.log_softmax(mt.tensor([[1000.0, 1001.0]]))
        self.assertTrue(all(math.isfinite(v) for v in out.data))
        self.assertAlmostEqual(out.data[1], -math.log(1 + math.exp(-1.0)), places=9)

    def test_cross_entropy_value_and_gradient(self):
        logits = mt.tensor([[2.0, 0.5, -1.0], [0.1, 0.2, 0.3]], True)
        loss = nn.cross_entropy(logits, [0, 2])
        p0 = math.exp(2.0) / (math.exp(2.0) + math.exp(0.5) + math.exp(-1.0))
        p1 = math.exp(0.3) / (math.exp(0.1) + math.exp(0.2) + math.exp(0.3))
        self.assertAlmostEqual(loss.item(), -(math.log(p0) + math.log(p1)) / 2, places=9)
        self.assertLess(mt.grad_check(lambda z: nn.cross_entropy(z, [0, 2]), [logits]), 1e-6)

    def test_cross_entropy_rejects_bad_targets(self):
        with self.assertRaises(ValueError):
            nn.cross_entropy(mt.tensor([[1.0, 2.0]]), [2])


if __name__ == "__main__":
    unittest.main()
