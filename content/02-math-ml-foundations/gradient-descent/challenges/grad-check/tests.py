import importlib.util
import os
import sys

path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
numerical_gradient = mod.numerical_gradient
relative_error = mod.relative_error


def f(p):
    x, y = p
    return x * x + 2 * y * y + x * y


def analytic(p):
    x, y = p
    return [2 * x + y, 4 * y + x]


def test_matches_analytic_gradient():
    p = [1.5, -2.0]
    err = relative_error(numerical_gradient(f, p), analytic(p))
    assert err < 1e-6, f"relative error too large: {err}"


def test_output_shape_and_input_untouched():
    p = [1.0, 2.0]
    g = numerical_gradient(f, p)
    assert len(g) == 2
    assert p == [1.0, 2.0], "do not modify the input point"


def test_centered_beats_one_sided():
    # The centered difference is exact for quadratics up to rounding; a
    # one-sided difference with h=1e-5 would be off by about h * curvature.
    p = [0.3, 0.7]
    g = numerical_gradient(f, p, h=1e-3)
    assert relative_error(g, analytic(p)) < 1e-8


def test_detects_a_wrong_gradient():
    p = [1.5, -2.0]
    wrong = [2 * p[0], 4 * p[1]]  # forgot the cross term
    assert relative_error(numerical_gradient(f, p), wrong) > 1e-2


def test_relative_error_zero_for_equal():
    assert relative_error([0.0, 0.0], [0.0, 0.0]) == 0.0


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001
                failures += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failures else 0)
