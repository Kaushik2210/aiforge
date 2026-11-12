1. Each account needs its own balance, so store it on the instance inside `__init__` with `self.balance = ...`, not as a variable written in the class body.
2. Check first, change second: raise for a bad amount or too little money before you touch `self.balance`, so a failed request leaves it alone.
3. Define `class InsufficientFunds(Exception)` and raise it for the overdraft; use `ValueError` for amounts that are zero or negative. `__repr__` should return the exact text `Account(balance=100)`.
