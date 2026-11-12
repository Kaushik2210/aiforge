# Wrong: inserts at the start instead of appending.
def collect(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.insert(0, item)
    return bucket
