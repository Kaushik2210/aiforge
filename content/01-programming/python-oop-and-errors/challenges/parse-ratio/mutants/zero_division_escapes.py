# Wrong: no zero check, so the caller gets ZeroDivisionError instead of ValueError.
def parse_ratio(text):
    top, bottom = text.split("/")
    return int(top) / int(bottom)
