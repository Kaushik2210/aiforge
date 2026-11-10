/**
 * A tiny typed event bus between the page (React) and a game (Phaser).
 * Event names and payloads are checked by TypeScript, one handler's error never
 * stops the others, and `clear()` removes everything so nothing leaks after a
 * game is destroyed.
 */

export type Handler<T> = (payload: T) => void;

export class TypedEmitter<E extends { [K in keyof E]: unknown }> {
  private handlers = new Map<keyof E, Set<Handler<never>>>();

  constructor(private readonly onError: (error: unknown, event: keyof E) => void = defaultOnError) {}

  /** Subscribe. Returns a function that unsubscribes. */
  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  once<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  off<K extends keyof E>(event: K, handler: Handler<E[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof E>(event: K, payload: E[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    // Copy first so handlers may unsubscribe (or subscribe) while we iterate.
    for (const handler of [...set]) {
      if (!set.has(handler)) continue;
      try {
        (handler as Handler<E[K]>)(payload);
      } catch (error) {
        this.onError(error, event);
      }
    }
  }

  listenerCount(event?: keyof E): number {
    if (event !== undefined) return this.handlers.get(event)?.size ?? 0;
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }

  clear(): void {
    this.handlers.clear();
  }
}

function defaultOnError(error: unknown, event: PropertyKey) {
  console.error(`Error in "${String(event)}" handler:`, error);
}
