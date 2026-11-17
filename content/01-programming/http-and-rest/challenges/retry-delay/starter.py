IDEMPOTENT_METHODS = {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"}
RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


def retry_delay(method, status, attempt, headers=None, base=0.5, cap=8.0, max_retries=5):
    """Decide whether to retry a failed request, and how long to wait first.

    method       the HTTP method used, for example "GET" (any letter case)
    status       the status code of the response that just failed
    attempt      0 for the first try that failed, 1 for the second, and so on
    headers      a dict with the request headers AND the response headers merged
                 (names in any case; may be None)
    base, cap    backoff in seconds: wait min(cap, base * 2 ** attempt)
    max_retries  retries allowed in total; when attempt >= max_retries, give up

    Returns None for "do not retry", otherwise the delay in seconds (a float).

    Rules
    - Only these statuses are worth retrying: 429, 500, 502, 503, 504.
      (A 501, 400 or 404 will fail again the same way. A 2xx or 3xx is not a failure.)
    - Only retry requests that are safe to repeat: GET, HEAD, PUT, DELETE and
      OPTIONS. POST and PATCH (and any other method) are retried ONLY when the
      headers contain a non-empty Idempotency-Key.
    - For 429 and 503, a Retry-After header holding a whole number of seconds
      (ASCII digits only; spaces around it are ignored) is used as the delay
      exactly (it is NOT capped). Dates, decimals, negatives and junk are
      ignored, and the normal backoff is used instead. Retry-After is ignored
      for 500, 502 and 504.
    - TRACE is left out of the list above on purpose: treat it like POST.
    - An Idempotency-Key of only spaces counts as empty.
    - A negative attempt raises ValueError, whatever the status (check it first).
    - The headers dict must not be changed.

    retry_delay("GET", 503, 0)                            -> 0.5
    retry_delay("GET", 503, 2)                            -> 2.0
    retry_delay("GET", 429, 0, {"Retry-After": "30"})     -> 30.0
    retry_delay("POST", 503, 0)                           -> None
    retry_delay("POST", 503, 0, {"Idempotency-Key": "k"}) -> 0.5
    retry_delay("GET", 404, 0)                            -> None
    """
    # TODO: say no early (status, attempt, method), then Retry-After, then backoff
    raise NotImplementedError("implement retry_delay")
