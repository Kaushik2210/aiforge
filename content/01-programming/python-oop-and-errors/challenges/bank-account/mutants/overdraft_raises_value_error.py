# Wrong: uses ValueError for the overdraft, so callers cannot tell the cases apart.
class InsufficientFunds(Exception):
    pass


class Account:
    def __init__(self, balance=0):
        if balance < 0:
            raise ValueError("negative")
        self.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("bad amount")
        self.balance += amount
        return self.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("bad amount")
        if amount > self.balance:
            raise ValueError("too much")
        self.balance -= amount
        return self.balance

    def __repr__(self):
        return f"Account(balance={self.balance!r})"
