import importlib.util
import os
import sys

path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
gradient_descent = mod.gradient_descent


def test_shifted_minimum():
    # f(x) = (x - 3)^2 / 2 has gradient x - 3.
    xs = gradient_descent(lambda x: x - 3, 0.0, 0.5, 3)
    assert [round(v, 6) for v in xs] == [0.0, 1.5, 2.25, 2.625]


def test_quartic_gradient():
    xs = gradient_descent(lambda x: 4 * x ** 3, 1.0, 0.1, 2)
    assert abs(xs[1] - 0.6) < 1e-12 and abs(xs[2] - 0.5136) < 1e-12


def test_negative_rate_climbs():
    xs = gradient_descent(lambda x: 2 * x, 10.0, -0.1, 1)
    assert abs(xs[1] - 12.0) < 1e-12


def test_many_steps_length():
    assert len(gradient_descent(lambda x: 2 * x, 1.0, 0.1, 25)) == 26


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
