def collect(item, bucket=None):
    """Add `item` to the end of `bucket` and return the bucket.

    - If a list is passed as `bucket`, add to THAT list (change it in place) and
      return the same list object, even when it is empty.
    - If no bucket is passed, start a new empty list for this call, so one call
      never sees the items from another call.

    collect(1)            -> [1]
    collect(2)            -> [2]      (not [1, 2])
    b = []; collect(5, b) -> b is now [5]
    """
    # TODO: decide when a new list is needed, then append and return
    raise NotImplementedError("implement collect")
