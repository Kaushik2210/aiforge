# Wrong: "bucket or []" swaps a given empty list for a new one.
def collect(item, bucket=None):
    bucket = bucket or []
    bucket.append(item)
    return bucket
