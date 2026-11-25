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
    """

    def __init__(self, value, parents=(), local_grads=()):
        self.value = float(value)
        self.grad = 0.0
        self._parents = tuple(parents)
        self._local = tuple(local_grads)

    @staticmethod
    def _lift(other):
        if isinstance(other, Var):
            return other
        if isinstance(other, (int, float)) and not isinstance(other, bool):
            return Var(other)
        return None

    def __add__(self, other):
        o = Var._lift(other)
        if o is None:
            return NotImplemented
        return Var(self.value + o.value, (self, o), (1.0, 1.0))

    __radd__ = __add__

    def __neg__(self):
        return Var(-self.value, (self,), (-1.0,))

    def __sub__(self, other):
        o = Var._lift(other)
        if o is None:
            return NotImplemented
        return Var(self.value - o.value, (self, o), (1.0, -1.0))

    def __rsub__(self, other):
        o = Var._lift(other)
        if o is None:
            return NotImplemented
        return o.__sub__(self)

    def __mul__(self, other):
        o = Var._lift(other)
        if o is None:
            return NotImplemented
        return Var(self.value * o.value, (self, o), (o.value, self.value))

    __rmul__ = __mul__

    def __truediv__(self, other):
        o = Var._lift(other)
        if o is None:
            return NotImplemented
        if o.value == 0.0:
            raise ZeroDivisionError("division by zero")
        return Var(
            self.value / o.value,
            (self, o),
            (1.0 / o.value, -self.value / (o.value * o.value)),
        )

    def __rtruediv__(self, other):
        o = Var._lift(other)
        if o is None:
            return NotImplemented
        return o.__truediv__(self)

    def __pow__(self, p):
        if isinstance(p, Var) or not isinstance(p, (int, float)) or isinstance(p, bool):
            return NotImplemented
        if p == 0:
            return Var(1.0, (self,), (1.0,))
        if p < 0 and self.value == 0.0:
            raise ZeroDivisionError("0 to a negative power")
        if self.value < 0.0 and p != int(p):
            raise ValueError("negative base with a fractional exponent")
        return Var(self.value ** p, (self,), (p * self.value ** (p - 1),))


def exp(x):
    if isinstance(x, Var):
        e = math.exp(x.value)
        return Var(e, (x,), (e,))
    return math.exp(x)


def tanh(x):
    if isinstance(x, Var):
        t = math.tanh(x.value)
        return Var(t, (x,), (1.0 - t * t,))
    return math.tanh(x)


def backward(out):
    """Fill .grad on every Var that contributed to out (including out itself).

    1. Every Var reachable from out has its grad reset to 0.0, so calling
       backward twice on the same graph gives the same answer (nothing from an
       earlier call is carried over). A Var that is NOT reachable from out is
       left exactly as it was.
    2. out.grad is set to 1.0.
    3. Gradients flow from out back to the leaves by the chain rule, and are
       ADDED together when a Var is used more than once.
    The walk is iterative: a chain of 1,500 operations must not hit the
    recursion limit.
    """
    order = []
    seen = set()
    stack = [(out, False)]
    while stack:
        node, done = stack.pop()
        if done:
            order.append(node)
            continue
        if id(node) in seen:
            continue
        seen.add(id(node))
        stack.append((node, True))
        for p in node._parents:
            if id(p) not in seen:
                stack.append((p, False))
    for node in order:
        node.grad = 0.0
    out.grad = 1.0
    for node in reversed(order):
        for parent, local in zip(node._parents, node._local):
            parent.grad += node.grad * local
