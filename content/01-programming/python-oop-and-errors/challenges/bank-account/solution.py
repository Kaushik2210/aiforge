class InsufficientFunds(Exception):
    """Raised when a withdrawal asks for more than the balance."""


class Account:
    def __init__(self, balance=0):
        if balance < 0:
            raise ValueError("starting balance cannot be negative")
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("amount must be greater than 0")
        self.balance += amount
        return self.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("amount must be greater than 0")
        if amount > self.balance:
            raise InsufficientFunds(f"cannot withdraw {amount} from {self.balance}")
        self.balance -= amount
        return self.balance

    def __repr__(self):
        return f"Account(balance={self.balance!r})"
