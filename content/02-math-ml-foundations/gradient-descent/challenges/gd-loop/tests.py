import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
gradient_descent = mod.gradient_descent


def square_grad(x):
    return 2 * x


def test_length_and_start():
    xs = gradient_descent(square_grad, 10.0, 0.2, 5)
    assert len(xs) == 6, "expected steps + 1 iterates"
    assert xs[0] == 10.0, "first iterate must be the starting point"


def test_first_step():
    xs = gradient_descent(square_grad, 10.0, 0.2, 1)
    assert abs(xs[1] - 6.0) < 1e-12, "10 - 0.2 * 20 should be 6"


def test_converges_with_small_rate():
    xs = gradient_descent(square_grad, 10.0, 0.2, 10)
    assert abs(xs[-1] - 0.0604661760) < 1e-6


def test_small_rate_is_slow():
    xs = gradient_descent(square_grad, 10.0, 0.05, 10)
    assert abs(xs[-1] - 3.486784401) < 1e-6


def test_large_rate_diverges():
    xs = gradient_descent(square_grad, 10.0, 1.1, 10)
    assert abs(xs[-1] - 61.917364224) < 1e-6, "lr=1.1 on x^2 must blow up"


def test_uses_the_gradient_it_is_given():
    # Constant gradient 3: x moves by exactly lr * 3 each step.
    xs = gradient_descent(lambda x: 3.0, 1.0, 0.5, 3)
    assert xs == [1.0, -0.5, -2.0, -3.5]
    # f(x) = 3x^2 has gradient 6x; one step from 1 with lr 0.1 gives 0.4.
    assert abs(gradient_descent(lambda x: 6 * x, 1.0, 0.1, 1)[1] - 0.4) < 1e-12


def test_zero_steps_returns_only_the_start():
    assert gradient_descent(square_grad, 7.0, 0.1, 0) == [7.0]


def test_rate_one_oscillates():
    xs = gradient_descent(square_grad, 10.0, 1.0, 4)
    assert xs == [10.0, -10.0, 10.0, -10.0, 10.0]


def test_repeated_calls_give_same_result():
    a = gradient_descent(square_grad, 3.0, 0.1, 3)
    b = gradient_descent(square_grad, 3.0, 0.1, 3)
    assert a == b, "no hidden state between calls"


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001 - report any failure kind
                failures += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failures else 0)
