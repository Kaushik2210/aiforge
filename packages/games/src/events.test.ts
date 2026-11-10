import { describe, expect, it, vi } from "vitest";
import { TypedEmitter } from "./events";

interface Ev {
  ping: { n: number };
  done: undefined;
}

describe("TypedEmitter", () => {
  it("delivers payloads to subscribers in order", () => {
    const bus = new TypedEmitter<Ev>();
    const seen: number[] = [];
    bus.on("ping", (p) => seen.push(p.n));
    bus.on("ping", (p) => seen.push(p.n * 10));
    bus.emit("ping", { n: 1 });
    bus.emit("ping", { n: 2 });
    expect(seen).toEqual([1, 10, 2, 20]);
  });

  it("unsubscribe function and off() both work", () => {
    const bus = new TypedEmitter<Ev>();
    const a = vi.fn();
    const b = vi.fn();
    const offA = bus.on("ping", a);
    bus.on("ping", b);
    offA();
    bus.off("ping", b);
    bus.emit("ping", { n: 1 });
    expect(a).not.toHaveBeenCalled();
    expect(b).not.toHaveBeenCalled();
  });

  it("once() fires exactly once", () => {
    const bus = new TypedEmitter<Ev>();
    const fn = vi.fn();
    bus.once("done", fn);
    bus.emit("done", undefined);
    bus.emit("done", undefined);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("an error in one handler does not stop the others and is reported", () => {
    const onError = vi.fn();
    const bus = new TypedEmitter<Ev>(onError);
    const after = vi.fn();
    bus.on("ping", () => {
      throw new Error("boom");
    });
    bus.on("ping", after);
    bus.emit("ping", { n: 1 });
    expect(after).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as Error).message).toBe("boom");
    expect(onError.mock.calls[0]![1]).toBe("ping");
  });

  it("handlers may unsubscribe themselves or others mid-emit", () => {
    const bus = new TypedEmitter<Ev>();
    const calls: string[] = [];
    let offB: () => void = () => {};
    bus.on("ping", () => {
      calls.push("a");
      offB();
    });
    offB = bus.on("ping", () => calls.push("b"));
    bus.emit("ping", { n: 1 });
    expect(calls).toEqual(["a"]);
  });

  it("a handler added during emit waits for the next emit", () => {
    const bus = new TypedEmitter<Ev>();
    const late = vi.fn();
    bus.on("ping", () => {
      bus.on("ping", late);
    });
    bus.emit("ping", { n: 1 });
    expect(late).not.toHaveBeenCalled();
    bus.emit("ping", { n: 2 });
    expect(late).toHaveBeenCalledTimes(1);
  });

  it("listenerCount and clear() leave nothing behind", () => {
    const bus = new TypedEmitter<Ev>();
    bus.on("ping", () => {});
    bus.on("ping", () => {});
    bus.on("done", () => {});
    expect(bus.listenerCount("ping")).toBe(2);
    expect(bus.listenerCount()).toBe(3);
    bus.clear();
    expect(bus.listenerCount()).toBe(0);
  });

  it("emitting with no listeners is harmless", () => {
    expect(() => new TypedEmitter<Ev>().emit("ping", { n: 1 })).not.toThrow();
  });
});
