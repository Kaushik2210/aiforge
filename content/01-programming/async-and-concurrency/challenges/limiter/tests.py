import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Pause = mod.Pause
Limiter = mod.Limiter

def drive(coros, max_steps=10_000):
    """A tiny round-robin loop used only by these tests (independent of your code)."""
    coros = list(coros)
    results = [None] * len(coros)
    alive = list(range(len(coros)))
    steps = 0
    while alive:
        still = []
        for i in alive:
            steps += 1
            if steps > max_steps:
                raise AssertionError("tasks never finished: is something waiting forever?")
            try:
                coros[i].send(None)
            except StopIteration as done:
                results[i] = done.value
            else:
                still.append(i)
        alive = still
    return results


def make_job(limiter, name, log, steps=3):
    async def job():
        async with limiter:
            log.append(("in", name, limiter.active))
            for _ in range(steps):
                await Pause()
            log.append(("out", name, limiter.active))
        return name

    return job()


def test_at_most_limit_tasks_are_inside_at_once_and_all_finish():
    limiter = Limiter(2)
    log = []
    results = drive([make_job(limiter, n, log) for n in "abcde"])
    assert results == list("abcde")
    assert max(a for kind, _, a in log if kind == "in") == 2
    assert limiter.active == 0


def test_the_limit_is_actually_reached():
    limiter = Limiter(3)
    log = []
    drive([make_job(limiter, n, log) for n in "abcdef"])
    assert max(a for kind, _, a in log if kind == "in") == 3


def test_limit_one_runs_tasks_one_after_another():
    limiter = Limiter(1)
    log = []
    drive([make_job(limiter, n, log) for n in "abc"])
    # each task leaves before the next one enters (the order they get in is not specified)
    assert [kind for kind, _, _ in log] == ["in", "out", "in", "out", "in", "out"]
    entered = [name for kind, name, _ in log if kind == "in"]
    assert sorted(entered) == ["a", "b", "c"]
    for i in range(0, 6, 2):
        assert log[i][1] == log[i + 1][1]  # the same task goes in and then out


def test_a_big_limit_lets_everyone_in_together():
    limiter = Limiter(10)
    log = []
    drive([make_job(limiter, n, log) for n in "abcd"])
    assert max(a for kind, _, a in log if kind == "in") == 4


def test_a_limit_below_one_is_rejected():
    for bad in (0, -1):
        try:
            Limiter(bad)
        except ValueError:
            continue
        raise AssertionError(f"Limiter({bad}) should raise ValueError")


def test_active_is_zero_when_nobody_is_inside():
    limiter = Limiter(2)
    assert limiter.active == 0
    drive([make_job(limiter, "a", [])])
    assert limiter.active == 0


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
