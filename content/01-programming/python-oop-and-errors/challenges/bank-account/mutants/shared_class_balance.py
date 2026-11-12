# Wrong: the balance lives on the class, so every account shares it.
class InsufficientFunds(Exception):
    pass


class Account:
    balance = 0

    def __init__(self, balance=0):
        if balance < 0:
            raise ValueError("negative")
        Account.balance = balance

    def deposit(self, amount):
        if amount <= 0:
            raise ValueError("bad amount")
        Account.balance += amount
        return Account.balance

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("bad amount")
        if amount > Account.balance:
            raise InsufficientFunds("too much")
        Account.balance -= amount
        return Account.balance

    def __repr__(self):
        return f"Account(balance={Account.balance!r})"
