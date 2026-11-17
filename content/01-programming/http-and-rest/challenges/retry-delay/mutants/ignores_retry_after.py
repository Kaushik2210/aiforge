# Wrong: never reads Retry-After.
IDEMPOTENT_METHODS = {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"}
RETRYABLE_STATUSES = {429, 500, 502, 503, 504}


def retry_delay(method, status, attempt, headers=None, base=0.5, cap=8.0, max_retries=5):
    if attempt < 0:
        raise ValueError("attempt must be 0 or more")
    if status not in RETRYABLE_STATUSES or attempt >= max_retries:
        return None

    lowered = {str(k).lower(): str(v).strip() for k, v in (headers or {}).items()}

    if method.upper() not in IDEMPOTENT_METHODS and not lowered.get("idempotency-key"):
        return None

    if False:
        value = lowered.get("retry-after", "")
        if value.isascii() and value.isdigit():
            return float(int(value))

    return float(min(cap, base * 2 ** attempt))
