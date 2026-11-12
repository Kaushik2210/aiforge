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


def raises(exc, fn, *args):
    try:
        fn(*args)
    except exc:
        return True
    except Exception as other:  # noqa: BLE001
        raise AssertionError(f"expected {exc.__name__}, got {type(other).__name__}")
    raise AssertionError(f"expected {exc.__name__}, but nothing was raised")


def test_default_and_given_starting_balance():
    assert Account().balance == 0
    assert Account(100).balance == 100


def test_deposit_adds_and_returns_the_new_balance():
    a = Account(10)
    assert a.deposit(25) == 35
    assert a.balance == 35


def test_withdraw_subtracts_and_returns_the_new_balance():
    a = Account(100)
    assert a.withdraw(40) == 60
    assert a.balance == 60


def test_overdraft_raises_insufficient_funds_and_keeps_the_balance():
    a = Account(50)
    assert raises(InsufficientFunds, a.withdraw, 51)
    assert a.balance == 50


def test_withdrawing_the_whole_balance_is_allowed():
    a = Account(30)
    assert a.withdraw(30) == 0


def test_non_positive_amounts_raise_value_error_and_change_nothing():
    a = Account(20)
    for bad in (0, -5):
        assert raises(ValueError, a.deposit, bad)
        assert raises(ValueError, a.withdraw, bad)
    assert a.balance == 20


def test_accounts_do_not_share_a_balance():
    a = Account(10)
    b = Account(10)
    a.deposit(5)
    assert a.balance == 15
    assert b.balance == 10


def test_repr_shows_the_balance():
    assert repr(Account(100)) == "Account(balance=100)"


def test_insufficient_funds_is_an_exception_class():
    assert issubclass(InsufficientFunds, Exception)


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
