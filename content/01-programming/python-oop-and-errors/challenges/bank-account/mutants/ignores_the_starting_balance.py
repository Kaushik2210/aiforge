# Wrong: always starts at 0.
class InsufficientFunds(Exception):
    pass


class Account:
    def __init__(self, balance=0):
        if balance < 0:
            raise ValueError("negative")
        self.balance = 0

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("bad amount")
        self.balance += amount
        return self.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("bad amount")
        if amount > self.balance:
            raise InsufficientFunds("too much")
        self.balance -= amount
        return self.balance

    def __repr__(self):
        return f"Account(balance={self.balance!r})"
