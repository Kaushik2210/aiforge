# Wrong: raises ValueError for zero but with no message.
def parse_ratio(text):
    top, bottom = text.split("/")
    top = int(top)
    bottom = int(bottom)
    if bottom == 0:
        raise ValueError()
    return top / bottom
