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


def test_a_new_var_is_a_float_leaf_with_zero_grad():
    x = Var(3)
    assert x.value == 3.0 and isinstance(x.value, float)
    assert x.grad == 0.0


def test_backward_on_a_leaf_gives_one():
    x = Var(2.0)
    backward(x)
    assert x.grad == 1.0


def test_sum_and_product():
    a, b = Var(2.0), Var(5.0)
    out = a * b + a
    assert close(out.value, 12.0)
    backward(out)
    assert close(a.grad, 6.0) and close(b.grad, 2.0)


def test_a_var_used_twice_accumulates():
    x = Var(3.0)
    y = x * x + x
    assert close(y.value, 12.0)
    backward(y)
    assert close(x.grad, 7.0)


def test_difference_and_negation():
    a, b = Var(4.0), Var(1.5)
    out = -(a - b) * 2
    backward(out)
    assert close(out.value, -5.0)
    assert close(a.grad, -2.0) and close(b.grad, 2.0)


def test_division_of_two_vars():
    a, b = Var(6.0), Var(3.0)
    out = a / b
    backward(out)
    assert close(out.value, 2.0)
    assert close(a.grad, 1 / 3) and close(b.grad, -6 / 9)


def test_numbers_on_either_side():
    x = Var(4.0)
    for out, val, g in [
        (x + 2, 6, 1), (2 + x, 6, 1),
        (x - 2, 2, 1), (10 - x, 6, -1),
        (x * 3, 12, 3), (3 * x, 12, 3),
        (x / 2, 2, 0.5), (8 / x, 2, -0.5),
    ]:
        assert isinstance(out, Var)
        assert close(out.value, val)
        backward(out)
        assert close(x.grad, g), (val, g, x.grad)


def test_power_with_a_constant_exponent():
    for p, x0, g in [(3, 2.0, 12.0), (-1, 2.0, -0.25), (0.5, 4.0, 0.25), (2, -3.0, -6.0)]:
        x = Var(x0)
        out = x ** p
        assert close(out.value, x0 ** p)
        backward(out)
        assert close(x.grad, g), (p, x0, x.grad)


def test_power_zero_has_no_slope():
    x = Var(5.0)
    out = x ** 0
    assert close(out.value, 1.0)
    backward(out)
    assert close(x.grad, 0.0)


def test_exp_and_tanh():
    x = Var(0.5)
    e = exp(x)
    backward(e)
    assert close(e.value, math.exp(0.5)) and close(x.grad, math.exp(0.5))
    y = Var(0.5)
    t = tanh(y)
    backward(t)
    assert close(t.value, math.tanh(0.5)) and close(y.grad, 1 - math.tanh(0.5) ** 2)


def test_exp_and_tanh_of_plain_numbers_are_floats():
    assert isinstance(exp(1), float) and close(exp(1), math.e)
    assert isinstance(tanh(0.3), float) and close(tanh(0.3), math.tanh(0.3))


def test_in_between_vars_get_gradients_too():
    a = Var(2.0)
    b = a * 3          # 6
    c = b * b          # 36
    out = c + b        # 42
    backward(out)
    assert close(out.grad, 1.0)
    assert close(c.grad, 1.0)
    assert close(b.grad, 2 * 6 + 1)
    assert close(a.grad, 13 * 3)


def test_diamond_shares_a_sub_expression():
    x = Var(2.0)
    s = x + 1            # shared by both branches
    out = s * s * s      # (x + 1) ^ 3
    backward(out)
    assert close(out.value, 27.0)
    assert close(x.grad, 3 * 9)
    x2 = Var(2.0)
    left, right = x2 * 2, x2 * 3
    out2 = left * right  # 6 x^2
    backward(out2)
    assert close(x2.grad, 12 * 2.0)


def test_calling_backward_twice_gives_the_same_answer():
    x = Var(3.0)
    y = x * x + x
    backward(y)
    backward(y)
    assert close(x.grad, 7.0)


def test_a_second_graph_starts_from_clean_gradients():
    x = Var(3.0)
    y1 = x * x
    backward(y1)
    assert close(x.grad, 6.0)
    y2 = x * 5
    backward(y2)
    assert close(x.grad, 5.0)  # not 6 + 5


def test_a_long_chain_does_not_hit_the_recursion_limit():
    x = Var(1.0)
    z = x
    for _ in range(1500):
        z = z * 1.0001
    backward(z)
    assert close(x.grad, 1.0001 ** 1500, 1e-8)


def test_wrong_use_raises():
    assert raises(ZeroDivisionError, lambda: Var(1.0) / 0)
    assert raises(ZeroDivisionError, lambda: Var(1.0) / Var(0.0))
    assert raises(ZeroDivisionError, lambda: 1 / Var(0.0))
    assert raises(ZeroDivisionError, lambda: Var(0.0) ** -1)
    assert raises(ValueError, lambda: Var(-4.0) ** 0.5)
    assert raises(TypeError, lambda: Var(2.0) ** Var(2.0))


def test_one_hidden_neuron_with_two_inputs():
    def loss(x1, x2, w1, w2, b, target):
        return (math.tanh(w1 * x1 + w2 * x2 + b) - target) ** 2

    vals = [0.5, -1.2, 0.8, 0.3, 0.1, 0.4]
    v = [Var(a) for a in vals]
    x1, x2, w1, w2, b, target = v
    out = (tanh(w1 * x1 + w2 * x2 + b) - target) ** 2
    assert close(out.value, loss(*vals))
    backward(out)
    for i in range(6):
        assert close(v[i].grad, central(loss, vals, i), 1e-7), i
    # by hand for w1: 2 * (t - target) * (1 - t^2) * x1
    t = math.tanh(0.8 * 0.5 + 0.3 * -1.2 + 0.1)
    assert close(w1.grad, 2 * (t - 0.4) * (1 - t * t) * 0.5)


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
