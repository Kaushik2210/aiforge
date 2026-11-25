import math


class Var:
    """A number in a computation graph.

    Var(value) makes a leaf: .value is float(value) and .grad starts at 0.0.
    (Extra constructor arguments are private to your own design; the tests only
    ever call Var(value).)

    Supported (a "number" is a plain int or float, treated as a constant)
    - a + b, a - b, a * b, a / b where each side is a Var or a number, and at
      least one side is a Var (so 2 * x, 1 - x and 1 / x work too).
    - -x
    - x ** p where p is a constant number (a Var exponent is not supported and
      raises TypeError). If p < 0 and x.value == 0, raise ZeroDivisionError.
      If p is not a whole number and x.value < 0, raise ValueError.
    - exp(x) and tanh(x): module functions. For a Var they return a Var; for a
      plain number they return a plain float.
    - Dividing by a number 0 or by a Var whose value is 0 raises ZeroDivisionError.

    Every operation computes its value right away and returns a NEW Var.

    Plan: each result remembers its parents and the LOCAL derivative of the
    result with respect to each parent. For a * b the locals are (b.value,
    a.value); for a + b they are (1, 1); for tanh(a) it is 1 - tanh(a) ** 2.
    """

    def __init__(self, value):
        self.value = float(value)
        self.grad = 0.0
        # TODO: remember the parents and local derivatives here (and add
        # optional constructor arguments for them if you like).

    # TODO: __add__, __radd__, __neg__, __sub__, __rsub__, __mul__, __rmul__,
    # __truediv__, __rtruediv__ and __pow__. A plain number on the other side is
    # a constant. Return NotImplemented for any other type of operand.


def exp(x):
    """e ** x. A Var in gives a Var out; a plain number in gives a float out."""
    raise NotImplementedError("implement exp")


def tanh(x):
    """Hyperbolic tangent. A Var in gives a Var out; a number in gives a float out.

    d/dx tanh(x) = 1 - tanh(x) ** 2
    """
    raise NotImplementedError("implement tanh")


def backward(out):
    """Fill .grad on every Var that contributed to out (including out itself).

    1. Every Var reachable from out has its grad reset to 0.0 first, so calling
       backward twice on the same graph gives the same answer (nothing from an
       earlier call is carried over). A Var that is NOT reachable from out is
       left exactly as it was.
    2. out.grad is set to 1.0.
    3. Gradients flow from out back to the leaves by the chain rule, and are
       ADDED together when a Var is used more than once (y = x * x + x gives
       x.grad == 2 * x + 1).
    Building the graph (adding, multiplying and so on) never touches any .grad:
    only backward does. A new Var starts with grad 0.0 and keeps it until then.
    The walk must be iterative (a loop with your own stack, not recursion):
    a chain of 1,500 operations must not hit the recursion limit.
    Visit each Var once, and only after everything that depends on it.
    """
    raise NotImplementedError("implement backward")
