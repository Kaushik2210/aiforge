import importlib.util
import math
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Var, exp, tanh, backward = mod.Var, mod.exp, mod.tanh, mod.backward
TOL = 1e-9


def close(a, b, tol=TOL):
    return abs(a - b) <= tol


def raises(exc, fn):
    try:
        fn()
    except exc:
        return True
    except Exception:  # noqa: BLE001
        return False
    return False


def central(f, args, i, h=1e-6):
    up = list(args)
    dn = list(args)
    up[i] += h
    dn[i] -= h
    return (f(*up) - f(*dn)) / (2 * h)


def test_one_var_used_in_many_places():
    x = Var(2.0)
    z = x
    for _ in range(4):
        z = z + x          # 5 x
    out = z * x + x * x    # 5x^2 + x^2 = 6x^2
    backward(out)
    assert close(out.value, 24.0)
    assert close(x.grad, 24.0)


def test_one_var_added_thousands_of_times():
    x = Var(1.5)
    z = Var(0.0)
    for _ in range(1500):
        z = z + x
    backward(z)
    assert close(x.grad, 1500.0)


def test_uneven_branches_need_a_real_topological_order():
    x = Var(1.5)
    deep = ((x * x) * x) * x          # x^4
    out = x + deep * x                # x + x^5
    backward(out)
    assert close(x.grad, 1 + 5 * 1.5 ** 4)
    y = Var(0.7)
    a = y * y
    b = a * y
    c = b + a
    d = c * a + b                     # (y^3 + y^2) y^2 + y^3 = y^5 + y^4 + y^3
    backward(d)
    assert close(y.grad, 5 * 0.7 ** 4 + 4 * 0.7 ** 3 + 3 * 0.7 ** 2)


def test_a_graph_with_two_inputs_built_in_a_different_order():
    a, b = Var(2.0), Var(3.0)
    p = b * b
    q = a * p
    r = q + a
    out = r * p
    backward(out)  # (a b^2 + a) b^2 = a b^4 + a b^2
    assert close(a.grad, 3.0 ** 4 + 3.0 ** 2)
    assert close(b.grad, 2.0 * 4 * 3.0 ** 3 + 2.0 * 2 * 3.0)


def test_stale_gradients_set_by_hand_are_cleared():
    x, y = Var(3.0), Var(4.0)
    out = x * y
    x.grad = 100.0
    y.grad = -50.0
    out.grad = 7.0
    backward(out)
    assert close(out.grad, 1.0)
    assert close(x.grad, 4.0) and close(y.grad, 3.0)


def test_a_var_outside_the_graph_keeps_its_gradient():
    x, other = Var(2.0), Var(9.0)
    other.grad = 42.0
    out = x * x
    backward(out)
    assert close(other.grad, 42.0)
    assert close(x.grad, 4.0)


def test_two_outputs_sharing_a_leaf():
    x, y = Var(2.0), Var(3.0)
    f = x * y
    g = x * x
    backward(f)
    assert close(x.grad, 3.0) and close(y.grad, 2.0)
    backward(g)
    assert close(x.grad, 4.0)      # reset, then filled for g only
    assert close(y.grad, 2.0)      # y is not in g's graph, so it is left alone


def test_building_a_graph_does_not_touch_gradients():
    x = Var(2.0)
    x.grad = 5.0
    _ = x * x + exp(x) / (1 + x)
    assert x.grad == 5.0


def test_values_are_computed_immediately():
    x = Var(0.5)
    out = exp(x) / (1 + tanh(x)) - x ** 2
    assert close(out.value, math.exp(0.5) / (1 + math.tanh(0.5)) - 0.25)


def test_a_small_two_layer_net_against_finite_differences():
    def net(x1, x2, a1, a2, b1, c1, c2, c0):
        h1 = math.tanh(a1 * x1 + a2 * x2 + b1)
        h2 = math.exp(-(c1 * x1 + c2 * x2) ** 2)
        y = (c0 * h1 + h2) / (1 + h1 * h1)
        return y * y

    vals = [0.3, -0.7, 0.9, -0.4, 0.2, 0.5, 0.6, 1.1]
    p = [Var(v) for v in vals]
    x1, x2, a1, a2, b1, c1, c2, c0 = p
    h1 = tanh(a1 * x1 + a2 * x2 + b1)
    h2 = exp(-(c1 * x1 + c2 * x2) ** 2)
    y = (c0 * h1 + h2) / (1 + h1 * h1)
    out = y * y
    assert close(out.value, net(*vals))
    backward(out)
    for i in range(len(vals)):
        assert close(p[i].grad, central(net, vals, i), 1e-6), i


def test_chains_of_tanh_and_exp_stay_iterative_and_correct():
    x = Var(0.1)
    z = x
    for _ in range(300):
        z = tanh(z) + x * 0.001
    backward(z)
    ref = 0.1
    g = 1.0
    for _ in range(300):
        g = (1 - math.tanh(ref) ** 2) * g + 0.001
        ref = math.tanh(ref) + 0.1 * 0.001
    assert close(z.value, ref, 1e-9)
    assert close(x.grad, g, 1e-9)


def test_power_of_a_composite_and_zero_base():
    x = Var(1.0)
    out = (x * x + 1) ** -1
    backward(out)
    assert close(out.value, 0.5) and close(x.grad, -0.5)
    z = Var(0.0)
    out2 = z ** 2
    backward(out2)
    assert close(z.grad, 0.0)


def test_constants_do_not_change_the_gradient_of_the_variable():
    x = Var(2.0)
    out = (3 - x) * (x / 4) + 7 / x - 1
    backward(out)
    expected = -(x.value / 4) + (3 - x.value) / 4 - 7 / x.value ** 2
    assert close(x.grad, expected)


def test_negation_and_reversed_subtraction_signs():
    x = Var(3.0)
    out = 10 - (-x) * 2
    backward(out)
    assert close(out.value, 16.0) and close(x.grad, 2.0)


def test_the_walk_is_iterative_even_when_the_recursion_limit_is_tight():
    x = Var(1.0)
    z = x
    for _ in range(1500):
        z = z * 1.0001
    # Lower the limit to just above the current depth, and ignore any attempt
    # by the submission to raise it again. A loop with your own stack does not
    # care; a recursive walk (even one that raises the limit) cannot finish.
    depth, frame = 0, sys._getframe()
    while frame is not None:
        depth += 1
        frame = frame.f_back
    old = sys.getrecursionlimit()
    real_set = sys.setrecursionlimit
    sys.setrecursionlimit = lambda n: None
    real_set(depth + 150)
    try:
        backward(z)
    finally:
        real_set(old)
        sys.setrecursionlimit = real_set
    assert close(x.grad, 1.0001 ** 1500, 1e-8)


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001
                failures += 1
                print(f"FAIL {name}: {e!r}")
    sys.exit(1 if failures else 0)
