def parse_ratio(text):
    """Turn text such as "3/4" into the float 0.75.

    - The text has two whole numbers separated by one "/" (spaces around the
      numbers are fine, and either number may have a minus sign).
    - Return the first divided by the second, as a float: "4/2" -> 2.0.
    - If the text is not in that form (no slash, more than one slash, a part
      that is not a whole number such as "1.5"), raise ValueError.
    - If the second number is zero, raise ValueError with a short message.
    - Do not hide other problems. If `text` is not a string at all (for example
      None), let Python's own error reach the caller: it must not be turned into
      a ValueError and must not be swallowed.
    """
    # TODO: split, convert, check for zero, divide
    raise NotImplementedError("implement parse_ratio")
