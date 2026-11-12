/**
 * A global safety valve for sudden bright or dark flashes.
 *
 * WCAG 2.2 success criterion 2.3.1 allows no more than three general flashes in
 * any one second (unless below the size and contrast thresholds). We stay well
 * under it: by default at most 2 flash events per rolling second, and the kit
 * only uses it for full-screen luminance changes (impact frames), never for
 * small effects. Callers ask first and skip the flash when refused.
 */
export class FlashLimiter {
  private readonly times: number[] = [];

  constructor(
    private readonly maxPerSecond = 2,
    private readonly windowMs = 1000,
  ) {
    if (!Number.isInteger(maxPerSecond) || maxPerSecond < 1 || maxPerSecond > 3) {
      throw new RangeError("maxPerSecond must be an integer from 1 to 3 (WCAG allows at most 3)");
    }
  }

  /** True when a flash may happen at `nowMs`; records it if so. */
  tryFlash(nowMs: number): boolean {
    while (this.times.length > 0 && nowMs - this.times[0]! >= this.windowMs) this.times.shift();
    if (this.times.length >= this.maxPerSecond) return false;
    this.times.push(nowMs);
    return true;
  }

  reset(): void {
    this.times.length = 0;
  }
}
