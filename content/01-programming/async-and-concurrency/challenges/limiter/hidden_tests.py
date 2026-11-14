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


def test_an_exception_inside_the_block_gives_the_place_back():
    class Boom(Exception):
        pass

    limiter = Limiter(1)

    async def failing():
        async with limiter:
            await Pause()
            raise Boom("inside")

    try:
        drive([failing()])
    except Boom:
        pass
    else:
        raise AssertionError("the exception must reach the caller")
    assert limiter.active == 0


def test_after_a_failure_waiting_tasks_still_get_in():
    class Boom(Exception):
        pass

    limiter = Limiter(1)
    log = []

    async def failing():
        async with limiter:
            await Pause()
            raise Boom()

    async def guarded(coro):
        try:
            await coro
        except Boom:
            log.append("caught")

    drive([guarded(failing()), make_job(limiter, "later", log)])
    assert "caught" in log
    assert ("in", "later", 1) in log


def test_separate_limiters_do_not_share_a_count():
    a = Limiter(1)
    b = Limiter(1)
    log = []
    drive([make_job(a, "x", log), make_job(b, "y", log)])
    # both get in straight away: neither waits for the other's place
    assert [kind for kind, _, _ in log] == ["in", "in", "out", "out"]
    assert [e for e in log if e[0] == "in"] == [("in", "x", 1), ("in", "y", 1)]


def test_a_second_batch_works_after_the_first_finished():
    limiter = Limiter(2)
    log = []
    drive([make_job(limiter, n, log) for n in "ab"])
    drive([make_job(limiter, n, log) for n in "cd"])
    assert limiter.active == 0
    assert len([e for e in log if e[0] == "in"]) == 4


def test_waiting_tasks_let_others_run():
    limiter = Limiter(1)
    log = []

    async def ticker():
        for i in range(6):
            log.append(("tick", i))
            await Pause()

    drive([make_job(limiter, "a", log, steps=4), make_job(limiter, "b", log, steps=4), ticker()])
    ticks = [e for e in log if e[0] == "tick"]
    assert len(ticks) == 6


def test_the_object_can_be_used_as_an_async_context_manager_directly():
    limiter = Limiter(1)

    async def use():
        async with limiter as entered:
            return entered is limiter or entered is None

    assert drive([use()]) == [True]


def test_many_tasks_with_a_small_limit():
    limiter = Limiter(4)
    log = []
    results = drive([make_job(limiter, i, log, steps=2) for i in range(40)])
    assert results == list(range(40))
    assert max(a for kind, _, a in log if kind == "in") == 4


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
