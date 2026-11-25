import math


class Dual:
    """A number that carries its derivative along: value + deriv * epsilon.

    Dual(value, deriv=0.0) stores two floats: .value and .deriv (both are
    converted with float(), so Dual(2).value is 2.0).

    Supported
    - a + b, a - b, a * b, a / b where each side is a Dual or a plain int or
      float (so 2 * d, 1 - d and 1 / d work too). Plain numbers count as
      constants: their derivative is 0.
    - -d (unary minus)
    - d ** n where n is an int, positive, zero or negative. A non-int exponent
      (a float, a Dual, a string) raises TypeError.
    - Dividing by zero (a plain 0 or a Dual whose value is 0) raises
      ZeroDivisionError. So does d ** n with n < 0 when d.value is 0.
    - d ** 0 is Dual(1.0, 0.0), even when d.value is 0.
    Anything else (for example number ** Dual) is not supported.
    """

    def __init__(self, value, deriv=0.0):
        self.value = float(value)
        self.deriv = float(deriv)

    @staticmethod
    def _lift(other):
        if isinstance(other, Dual):
            return other
        if isinstance(other, (int, float)) and not isinstance(other, bool):
            return Dual(other, 0.0)
        return None

    def __add__(self, other):
        o = Dual._lift(other)
        if o is None:
            return NotImplemented
        return Dual(self.value + o.value, self.deriv + o.deriv)

    __radd__ = __add__

    def __neg__(self):
        return Dual(-self.value, -self.deriv)

    def __sub__(self, other):
        o = Dual._lift(other)
        if o is None:
            return NotImplemented
        return Dual(self.value - o.value, self.deriv - o.deriv)

    def __rsub__(self, other):
        o = Dual._lift(other)
        if o is None:
            return NotImplemented
        return o.__sub__(self)

    def __mul__(self, other):
        o = Dual._lift(other)
        if o is None:
            return NotImplemented
        return Dual(self.value * o.value, self.deriv * o.value + self.value * o.deriv)

    __rmul__ = __mul__

    def __truediv__(self, other):
        o = Dual._lift(other)
        if o is None:
            return NotImplemented
        if o.value == 0.0:
            raise ZeroDivisionError("division by zero")
        q = self.value / o.value
        return Dual(q, (self.deriv * o.value - self.value * o.deriv) / (o.value * o.value))

    def __rtruediv__(self, other):
        o = Dual._lift(other)
        if o is None:
            return NotImplemented
        return o.__truediv__(self)

    def __pow__(self, n):
        if not isinstance(n, int) or isinstance(n, bool):
            raise TypeError("exponent must be an int")
        if n == 0:
            return Dual(1.0, 0.0)
        if n < 0 and self.value == 0.0:
            raise ZeroDivisionError("0 to a negative power")
        return Dual(self.value ** n, n * self.value ** (n - 1) * self.deriv)


def exp(x):
    if isinstance(x, Dual):
        e = math.exp(x.value)
        return Dual(e, e * x.deriv)
    return Dual(math.exp(x), 0.0)


def log(x):
    if isinstance(x, Dual):
        if x.value <= 0.0:
            raise ValueError("log of a non-positive value")
        return Dual(math.log(x.value), x.deriv / x.value)
    if x <= 0.0:
        raise ValueError("log of a non-positive value")
    return math.log(x)


def sin(x):
    if isinstance(x, Dual):
        return Dual(math.sin(x.value), math.cos(x.value) * x.deriv)
    return math.sin(x)


def cos(x):
    if isinstance(x, Dual):
        return Dual(math.cos(x.value), -math.sin(x.value) * x.deriv)
    return math.cos(x)


def derivative(f, x):
    """Return f'(x) as a float by running f on Dual(x, 1.0).

    If f returns a plain number (a constant function) the derivative is 0.0.
    """
    out = f(Dual(x, 1.0))
    if isinstance(out, Dual):
        return out.deriv
    return 0.0
