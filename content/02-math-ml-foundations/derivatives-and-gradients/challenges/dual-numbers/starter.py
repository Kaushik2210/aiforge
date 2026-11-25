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

    Every operation returns a NEW Dual; it never changes its inputs.
    The rules to apply (u and v are Duals, u' and v' their derivatives):
        (u + v)' = u' + v'          (u * v)' = u' * v + u * v'
        (u / v)' = (u' * v - u * v') / v ** 2
        (u ** n)' = n * u ** (n - 1) * u'
    """

    def __init__(self, value, deriv=0.0):
        self.value = float(value)
        self.deriv = float(deriv)

    # TODO: __add__, __radd__, __neg__, __sub__, __rsub__, __mul__, __rmul__,
    # __truediv__, __rtruediv__ and __pow__.
    # For a plain number on the other side, treat it as Dual(number, 0.0).
    # Return NotImplemented for any other type of operand.


def exp(x):
    """e ** x. For a float (or int) return a plain float; for a Dual return a Dual.

    d/dx exp(u) = exp(u) * u'
    """
    raise NotImplementedError("implement exp")


def log(x):
    """Natural log. Float in, float out; Dual in, Dual out.

    A value that is zero or negative raises ValueError (for floats and Duals).
    d/dx log(u) = u' / u
    """
    raise NotImplementedError("implement log")


def sin(x):
    """sin(x) in radians. Float in, float out; Dual in, Dual out."""
    raise NotImplementedError("implement sin")


def cos(x):
    """cos(x) in radians. Float in, float out; Dual in, Dual out."""
    raise NotImplementedError("implement cos")


def derivative(f, x):
    """Return f'(x) as a float by calling f(Dual(x, 1.0)).

    If f returns a plain number instead of a Dual (a constant function such as
    lambda t: 5.0), the derivative is 0.0.

    derivative(lambda t: t * t, 3.0)    -> 6.0
    derivative(lambda t: sin(t * t), 0) -> 0.0
    """
    raise NotImplementedError("implement derivative")
