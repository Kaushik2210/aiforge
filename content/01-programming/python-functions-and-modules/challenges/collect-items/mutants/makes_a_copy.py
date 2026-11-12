# Wrong: builds a new list, so the caller's list never changes.
def collect(item, bucket=None):
    if bucket is None:
        bucket = []
    return bucket + [item]
