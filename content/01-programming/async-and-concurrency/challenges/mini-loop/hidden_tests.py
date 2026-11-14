import importlib.util
import os
import sys

# The runner passes the file under test via SUBMISSION (starter or solution).
path = os.environ.get("SUBMISSION") or sys.argv[1]
spec = importlib.util.spec_from_file_location("submission", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Pause = mod.Pause
run_all = mod.run_all


async def worker(name, steps, log):
    for i in range(steps):
        log.append((name, i))
        await Pause()
    return name


def test_three_workers_round_robin():
    log = []
    run_all([worker("A", 2, log), worker("B", 2, log), worker("C", 2, log)])
    assert log == [("A", 0), ("B", 0), ("C", 0), ("A", 1), ("B", 1), ("C", 1)]


def test_a_task_does_not_start_until_the_loop_runs_it():
    log = []
    coros = [worker("A", 1, log), worker("B", 1, log)]
    assert log == []  # creating coroutine objects runs nothing
    run_all(coros)
    assert log == [("A", 0), ("B", 0)]


def test_none_and_other_return_values_are_kept():
    async def nothing():
        await Pause()

    async def number():
        return 7

    assert run_all([nothing(), number()]) == [None, 7]


def test_nested_awaits_work():
    log = []

    async def inner(tag):
        log.append(tag + "1")
        await Pause()
        log.append(tag + "2")
        return tag

    async def outer(tag):
        first = await inner(tag)
        await Pause()
        return first + "!"

    assert run_all([outer("x"), outer("y")]) == ["x!", "y!"]
    assert log == ["x1", "y1", "x2", "y2"]


def test_each_pause_gives_every_other_task_exactly_one_step():
    log = []
    run_all([worker("A", 4, log), worker("B", 4, log)])
    assert [n for n, _ in log] == ["A", "B"] * 4


def test_a_big_number_of_tasks():
    async def count(n):
        total = 0
        for i in range(n):
            total += i
            await Pause()
        return total

    assert run_all([count(k) for k in range(50)]) == [sum(range(k)) for k in range(50)]


def test_the_same_function_with_different_arguments_is_fine():
    log = []
    assert run_all([worker("same", 1, log), worker("same", 1, log)]) == ["same", "same"]
    assert len(log) == 2


def test_an_exception_stops_the_loop_before_later_rounds():
    class Boom(Exception):
        pass

    log = []

    async def bad():
        log.append("bad")
        await Pause()
        raise Boom()

    try:
        run_all([bad(), worker("A", 5, log)])
    except Boom:
        pass
    else:
        raise AssertionError("expected Boom")
    assert ("A", 4) not in log


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
