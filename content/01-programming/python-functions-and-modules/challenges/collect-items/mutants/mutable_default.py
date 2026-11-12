# Wrong: the default list is created once and shared by every call.
def collect(item, bucket=[]):
    bucket.append(item)
    return bucket
