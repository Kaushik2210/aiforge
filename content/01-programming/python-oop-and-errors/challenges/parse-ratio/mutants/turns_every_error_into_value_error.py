# Wrong: converts every failure, even a non-string, into ValueError.
def parse_ratio(text):
    try:
        top, bottom = text.split("/")
        top = int(top)
        bottom = int(bottom)
        if bottom == 0:
            raise ValueError("denominator is zero")
        return top / bottom
    except Exception as e:
        raise ValueError("bad ratio") from e
