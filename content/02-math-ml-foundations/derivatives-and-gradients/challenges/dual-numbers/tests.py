import importlib.util
import math
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Dual = mod.Dual
exp, log, sin, cos = mod.exp, mod.log, mod.sin, mod.cos
derivative = mod.derivative
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


def test_constructor_stores_floats():
    d = Dual(2, 3)
    assert d.value == 2.0 and d.deriv == 3.0
    assert isinstance(d.value, float) and isinstance(d.deriv, float)
    assert Dual(4).deriv == 0.0


def test_sum_and_difference():
    s = Dual(2, 1) + Dual(5, 3)
    assert close(s.value, 7) and close(s.deriv, 4)
    d = Dual(2, 1) - Dual(5, 3)
    assert close(d.value, -3) and close(d.deriv, -2)


def test_product_rule():
    p = Dual(3, 1) * Dual(4, 2)  # slope: 1*4 + 3*2
    assert close(p.value, 12) and close(p.deriv, 10)


def test_quotient_rule():
    q = Dual(6, 1) / Dual(3, 2)  # slope: (1*3 - 6*2) / 9
    assert close(q.value, 2) and close(q.deriv, -1.0)


def test_plain_numbers_on_either_side():
    d = Dual(3, 1)
    for r, v, dv in [
        (d + 2, 5, 1), (2 + d, 5, 1),
        (d - 2, 1, 1), (10 - d, 7, -1),
        (d * 4, 12, 4), (4 * d, 12, 4),
        (d / 2, 1.5, 0.5), (6 / d, 2, -6 / 9),
    ]:
        assert isinstance(r, Dual)
        assert close(r.value, v) and close(r.deriv, dv), (r.value, r.deriv, v, dv)


def test_negation():
    n = -Dual(2, 5)
    assert close(n.value, -2) and close(n.deriv, -5)


def test_integer_powers():
    d = Dual(2, 1)
    for n, v, dv in [(1, 2, 1), (2, 4, 4), (3, 8, 12), (5, 32, 80), (-1, 0.5, -0.25), (-2, 0.25, -0.25)]:
        r = d ** n
        assert close(r.value, v) and close(r.deriv, dv), (n, r.value, r.deriv)


def test_power_applies_the_chain_rule():
    r = Dual(2, 3) ** 3  # 3 * 2^2 * 3
    assert close(r.value, 8) and close(r.deriv, 36)


def test_power_zero_is_one_with_no_slope():
    r = Dual(5, 1) ** 0
    assert close(r.value, 1) and close(r.deriv, 0)


def test_exp_log_sin_cos_values_and_slopes():
    x = 0.7
    assert close(derivative(exp, x), math.exp(x))
    assert close(derivative(log, x), 1 / x)
    assert close(derivative(sin, x), math.cos(x))
    assert close(derivative(cos, x), -math.sin(x))


def test_functions_on_plain_floats_return_floats():
    for fn, ref in [(exp, math.exp), (sin, math.sin), (cos, math.cos), (log, math.log)]:
        r = fn(1.5)
        assert isinstance(r, float) and close(r, ref(1.5))


def test_functions_on_duals_return_duals():
    for fn in (exp, log, sin, cos):
        assert isinstance(fn(Dual(1.5, 1)), Dual)


def test_derivative_of_polynomials():
    assert close(derivative(lambda t: t * t, 3.0), 6.0)
    assert close(derivative(lambda t: 3 * t ** 4 - 2 * t + 7, 2.0), 3 * 4 * 8 - 2)
    assert close(derivative(lambda t: (t + 1) * (t - 1), 5.0), 10.0)


def test_derivative_of_reciprocal_and_fraction():
    assert close(derivative(lambda t: 1 / t, 4.0), -1 / 16)
    x = 0.5
    expected = (1 - x * x) / (1 + x * x) ** 2
    assert close(derivative(lambda t: t / (1 + t * t), x), expected)


def test_chain_rule_examples():
    x = 1.3
    assert close(derivative(lambda t: sin(t * t), x), 2 * x * math.cos(x * x))
    assert close(derivative(lambda t: exp(2 * t), x), 2 * math.exp(2 * x))
    assert close(derivative(lambda t: log(t * t + 1), x), 2 * x / (x * x + 1))
    assert close(derivative(lambda t: cos(3 * t + 1), x), -3 * math.sin(3 * x + 1))


def test_derivative_returns_a_float_and_handles_constants():
    r = derivative(lambda t: t * t, 3)
    assert isinstance(r, float)
    assert derivative(lambda t: 5.0, 2.0) == 0.0


def test_log_of_non_positive_raises_value_error():
    assert raises(ValueError, lambda: log(0.0))
    assert raises(ValueError, lambda: log(-1.0))
    assert raises(ValueError, lambda: log(Dual(0.0, 1.0)))
    assert raises(ValueError, lambda: log(Dual(-2.0, 1.0)))


def test_division_by_zero_raises():
    assert raises(ZeroDivisionError, lambda: Dual(1, 1) / 0)
    assert raises(ZeroDivisionError, lambda: Dual(1, 1) / Dual(0, 1))
    assert raises(ZeroDivisionError, lambda: 1 / Dual(0, 1))
    assert raises(ZeroDivisionError, lambda: Dual(0, 1) ** -1)


def test_non_integer_exponent_raises_type_error():
    assert raises(TypeError, lambda: Dual(2, 1) ** 0.5)
    assert raises(TypeError, lambda: Dual(2, 1) ** Dual(2, 0))


def test_operations_do_not_change_their_inputs():
    a, b = Dual(2, 1), Dual(3, 1)
    _ = a * b + a / b - a ** 2
    assert (a.value, a.deriv, b.value, b.deriv) == (2.0, 1.0, 3.0, 1.0)


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
