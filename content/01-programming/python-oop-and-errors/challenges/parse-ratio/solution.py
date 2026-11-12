def parse_ratio(text):
    top, bottom = text.split("/")
    top = int(top)
    bottom = int(bottom)
    if bottom == 0:
        raise ValueError("denominator is zero")
    return top / bottom
