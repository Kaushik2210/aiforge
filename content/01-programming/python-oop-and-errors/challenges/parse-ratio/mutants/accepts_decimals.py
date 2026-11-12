# Wrong: float() accepts "1.5/2" and "1e3/2" though only whole numbers are allowed.
def parse_ratio(text):
    top, bottom = text.split("/")
    top = float(top)
    bottom = float(bottom)
    if bottom == 0:
        raise ValueError("denominator is zero")
    return top / bottom
