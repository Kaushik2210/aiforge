import importlib.util
import os
import sys

path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
numerical_gradient = mod.numerical_gradient
relative_error = mod.relative_error


def test_cubic_matches_analytic():
    g = numerical_gradient(lambda p: p[0] ** 3, [2.0])
    assert abs(g[0] - 12.0) < 1e-6


def test_uses_the_h_you_pass():
    # Centered difference of x^3 at 1 with h=0.5 is exactly 3.25.
    g = numerical_gradient(lambda p: p[0] ** 3, [1.0], h=0.5)
    assert abs(g[0] - 3.25) < 1e-9, f"got {g[0]}"


def test_three_coordinates():
    f = lambda p: p[0] * p[1] + p[2] ** 2
    g = numerical_gradient(f, [2.0, 3.0, 4.0])
    assert len(g) == 3
    assert relative_error(g, [3.0, 2.0, 8.0]) < 1e-6


def test_relative_error_value():
    assert abs(relative_error([100.0], [101.0]) - 1 / 101) < 1e-12


def test_relative_error_near_zero():
    assert abs(relative_error([0.0], [1e-3]) - 1.0) < 1e-9


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
