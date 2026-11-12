# Wrong: keeps the default repr.
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
            raise InsufficientFunds("too much")
        self.balance -= amount
        return self.balance

    def __repr__(self):
        return object.__repr__(self)
