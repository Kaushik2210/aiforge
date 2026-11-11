"""minitorch: a tiny tensor and autograd library for learning how deep learning libraries work."""

from . import nn, optim
from .gradcheck import grad_check, numerical_grad
from .tensor import Tensor, broadcast_shapes, ones, randn, tensor, zeros

__all__ = ["Tensor", "tensor", "zeros", "ones", "randn", "broadcast_shapes", "grad_check", "numerical_grad", "nn", "optim"]
__version__ = "0.1.0"
