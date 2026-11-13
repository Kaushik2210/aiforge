class Countdown:
    """Countdown(3) counts 3, 2, 1.

    for n in Countdown(3): ...        -> 3, then 2, then 1
    list(Countdown(3))                -> [3, 2, 1]

    - A start of 0 or less gives nothing.
    - You can loop over the same Countdown again and again: every loop starts
      from the beginning.
    - Two loops over the same object can run at the same time (one inside the
      other) without disturbing each other.
    """

    def __init__(self, start):
        # TODO: remember the starting number
        raise NotImplementedError("implement Countdown")

    # TODO: make the object iterable
