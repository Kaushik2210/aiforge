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


def test_two_workers_take_turns():
    log = []
    run_all([worker("A", 2, log), worker("B", 2, log)])
    assert log == [("A", 0), ("B", 0), ("A", 1), ("B", 1)]


def test_results_come_back_in_the_order_given():
    log = []
    assert run_all([worker("A", 3, log), worker("B", 1, log)]) == ["A", "B"]


def test_results_are_in_given_order_even_when_a_later_one_finishes_first():
    log = []
    assert run_all([worker("slow", 5, log), worker("fast", 0, log)]) == ["slow", "fast"]


def test_a_task_that_never_pauses_just_runs():
    async def quick():
        return 42

    assert run_all([quick()]) == [42]


def test_no_coroutines_gives_an_empty_list():
    assert run_all([]) == []


def test_shorter_workers_drop_out_and_the_rest_carry_on():
    log = []
    run_all([worker("A", 1, log), worker("B", 3, log)])
    assert log == [("A", 0), ("B", 0), ("B", 1), ("B", 2)]


def test_an_exception_reaches_the_caller():
    class Boom(Exception):
        pass

    async def bad():
        await Pause()
        raise Boom("no")

    try:
        run_all([bad()])
    except Boom:
        return
    raise AssertionError("the exception should have propagated out of run_all")


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
