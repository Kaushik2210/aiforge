# Wrong: a blanket except hides every problem, including bugs in the caller, and returns None.
def parse_ratio(text):
    try:
        top, bottom = text.split("/")
        top = int(top)
        bottom = int(bottom)
        if bottom == 0:
            raise ValueError("denominator is zero")
        return top / bottom
    except Exception:
        return None
