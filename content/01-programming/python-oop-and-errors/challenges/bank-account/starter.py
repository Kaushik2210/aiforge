class InsufficientFunds(Exception):
    """Raised when a withdrawal asks for more than the balance."""


class Account:
    """A simple bank account.

    Account()          -> balance 0
    Account(100)       -> balance 100
    a.deposit(25)      -> adds 25 and returns the new balance
    a.withdraw(40)     -> subtracts 40 and returns the new balance
    repr(Account(100)) -> "Account(balance=100)"

    Rules:
    - `balance` is a normal attribute on each account. Accounts never share it.
    - A negative starting balance raises ValueError.
    - deposit and withdraw need an amount greater than 0, otherwise raise
      ValueError.
    - withdraw raises InsufficientFunds if the amount is more than the balance.
      Taking out exactly the whole balance is allowed.
    - A request that raises must leave the balance unchanged.
    """

    def __init__(self, balance=0):
        # TODO: check the starting balance, then store it on this instance
        raise NotImplementedError("implement Account")

    # TODO: deposit, withdraw and __repr__
