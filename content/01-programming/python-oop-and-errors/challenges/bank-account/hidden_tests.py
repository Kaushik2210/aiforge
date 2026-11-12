import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Account = mod.Account
InsufficientFunds = mod.InsufficientFunds


def test_negative_starting_balance_is_rejected():
    try:
        Account(-1)
    except ValueError:
        return
    raise AssertionError("Account(-1) should raise ValueError")


def test_a_sequence_of_operations():
    a = Account()
    a.deposit(100)
    a.withdraw(30)
    a.deposit(5)
    try:
        a.withdraw(1000)
    except InsufficientFunds:
        pass
    a.withdraw(75)
    assert a.balance == 0


def test_float_amounts():
    a = Account(1.5)
    assert a.deposit(0.25) == 1.75
    assert repr(a) == "Account(balance=1.75)"


def test_repr_follows_the_balance():
    a = Account(1)
    a.deposit(1)
    assert repr(a) == "Account(balance=2)"


def test_a_subclass_can_reuse_it():
    class Savings(Account):
        def __init__(self, balance=0, rate=0.01):
            super().__init__(balance)
            self.rate = rate

    s = Savings(200, rate=0.05)
    assert s.deposit(50) == 250
    assert s.rate == 0.05
    assert isinstance(s, Account)


def test_catching_the_exception_by_its_class_works():
    a = Account(5)
    try:
        a.withdraw(6)
    except InsufficientFunds as e:
        assert isinstance(e, Exception)
    else:
        raise AssertionError("no exception raised")


def test_a_failed_withdraw_does_not_hide_a_later_good_one():
    a = Account(10)
    try:
        a.withdraw(11)
    except InsufficientFunds:
        pass
    assert a.withdraw(10) == 0


def test_many_accounts_stay_separate():
    accounts = [Account(i) for i in range(5)]
    for acct in accounts:
        acct.deposit(1)
    assert [acct.balance for acct in accounts] == [1, 2, 3, 4, 5]


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS {name}")
            except Exception as e:  # noqa: BLE001 - report any failure kind
                failures += 1
                print(f"FAIL {name}: {e}")
    sys.exit(1 if failures else 0)
