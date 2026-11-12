# Wrong: forgets to return the list.
def collect(item, bucket=None):
    if bucket is None:
        bucket = []
    bucket.append(item)
