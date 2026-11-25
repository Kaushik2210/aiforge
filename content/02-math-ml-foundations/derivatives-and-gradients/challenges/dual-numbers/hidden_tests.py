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


def central(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)


def test_matches_central_difference_on_a_messy_function():
    def f(t):
        return sin(t) * exp(t / 3) / (2 + t * t) + log(1 + t * t) ** 2 - 4 / (t + 5)

    for x in (-1.5, 0.0, 0.3, 2.0):
        assert close(derivative(f, x), central(f, x), 1e-6), x


def test_nested_compositions():
    x = 0.4
    f = lambda t: exp(sin(cos(t)))
    expected = math.exp(math.sin(math.cos(x))) * math.cos(math.cos(x)) * (-math.sin(x))
    assert close(derivative(f, x), expected)
    g = lambda t: log(exp(t) + 1)  # softplus: the slope is the sigmoid
    assert close(derivative(g, x), 1 / (1 + math.exp(-x)))


def test_variable_used_many_times():
    # t*t*t + t*t + t has slope 3t^2 + 2t + 1 = 17 at t = 2
    assert close(derivative(lambda t: t * t * t + t * t + t, 2.0), 17.0)
    # (t + t) * (t - 2t) = -2t^2 has slope -4t = -12 at t = 3
    assert close(derivative(lambda t: (t + t) * (t - t * 2), 3.0), -12.0)


def test_quotient_with_duals_on_both_sides():
    x = 1.7
    f = lambda t: sin(t) / cos(t)  # tan
    assert close(derivative(f, x), 1 / math.cos(x) ** 2, 1e-8)
    g = lambda t: (t * t + 1) / (t - 5)
    assert close(derivative(g, 2.0), (2 * 2.0 * (2.0 - 5) - (4 + 1)) / (2.0 - 5) ** 2)


def test_reversed_operators_keep_order():
    d = Dual(2, 1)
    r = 1 - d * d  # 1 - t^2
    assert close(r.value, -3) and close(r.deriv, -4)
    q = 8 / (d * d)  # 8 / t^2, slope -16 / t^3
    assert close(q.value, 2) and close(q.deriv, -2)


def test_negative_powers_use_the_chain_rule():
    r = Dual(2, 3) ** -2  # -2 * 2^-3 * 3
    assert close(r.value, 0.25) and close(r.deriv, -0.75)
    assert close(derivative(lambda t: (t * t + 1) ** -1, 1.0), -2 * 1.0 / 4)


def test_power_zero_at_zero():
    r = Dual(0, 1) ** 0
    assert close(r.value, 1) and close(r.deriv, 0)
    r2 = Dual(0, 1) ** 2
    assert close(r2.value, 0) and close(r2.deriv, 0)
    r3 = Dual(0, 1) ** 1
    assert close(r3.value, 0) and close(r3.deriv, 1)


def test_negative_values_and_powers():
    r = Dual(-2, 1) ** 3
    assert close(r.value, -8) and close(r.deriv, 12)
    r2 = Dual(-2, 1) ** -1
    assert close(r2.value, -0.5) and close(r2.deriv, -0.25)


def test_log_just_above_zero_is_allowed():
    r = log(Dual(1e-300, 1.0))
    assert close(r.value, math.log(1e-300))
    assert abs(r.deriv - 1e300) / 1e300 < 1e-12


def test_int_inputs_give_float_outputs():
    assert isinstance(exp(0), float) and exp(0) == 1.0
    assert isinstance(sin(0), float) and sin(0) == 0.0
    assert isinstance(log(1), float) and log(1) == 0.0
    r = exp(Dual(-50, 1))
    assert abs(r.deriv - math.exp(-50)) < 1e-30


def test_derivative_with_int_input_and_constant_results():
    assert isinstance(derivative(lambda t: t + 1, 2), float)
    assert derivative(lambda t: t * 0 + 3, 1.0) == 0.0
    assert derivative(lambda t: 7, 1.0) == 0.0


def test_derivative_does_not_leak_between_calls():
    f = lambda t: t * t
    assert close(derivative(f, 2.0), 4.0)
    assert close(derivative(f, 3.0), 6.0)
    assert close(derivative(f, 2.0), 4.0)


def test_constants_keep_the_slope():
    d = Dual(3, 2)
    assert close((d + 5).deriv, 2) and close((5 + d).deriv, 2)
    assert close((d - 5).deriv, 2) and close((5 - d).deriv, -2)
    assert close((d * 5).deriv, 10) and close((d / 5).deriv, 0.4)


def test_cos_and_sin_signs_through_a_chain():
    x = 0.9
    assert close(derivative(lambda t: cos(2 * t), x), -2 * math.sin(2 * x))
    assert close(derivative(lambda t: sin(t) ** 2, x), 2 * math.sin(x) * math.cos(x))


def test_float_exponents_are_rejected_even_when_whole():
    assert raises(TypeError, lambda: Dual(2, 1) ** 2.0)
    assert raises(TypeError, lambda: Dual(2, 1) ** -1.0)


def test_even_powers_of_a_negative_value_keep_the_sign():
    r = Dual(-2, 1) ** 2  # slope 2 * (-2)
    assert close(r.value, 4) and close(r.deriv, -4)
    r = Dual(-2, 1) ** 4  # slope 4 * (-2)^3
    assert close(r.value, 16) and close(r.deriv, -32)
    r = Dual(-2, 1) ** -2  # slope -2 * (-2)^-3
    assert close(r.value, 0.25) and close(r.deriv, 0.25)


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
