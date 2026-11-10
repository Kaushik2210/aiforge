import { beforeEach, describe, expect, it, vi } from "vitest";
import { GameHost, __resetActiveHost, type GameLike } from "./host";

interface Ev { ready: undefined }
interface Cmd { go: undefined }

const container = {} as HTMLElement;

function fakeGame() {
  const game = { destroy: vi.fn() } satisfies GameLike;
  return game;
}

/** A factory whose completion we control from the test. */
function deferredFactory() {
  let resolve!: (g: GameLike) => void;
  let reject!: (e: unknown) => void;
  const factory = vi.fn(
    () =>
      new Promise<GameLike>((res, rej) => {
        resolve = res;
        reject = rej;
      }),
  );
  return { factory, resolve: (g: GameLike) => resolve(g), reject: (e: unknown) => reject(e) };
}

beforeEach(() => __resetActiveHost());

describe("GameHost lifecycle", () => {
  it("goes idle, loading, running", async () => {
    const game = fakeGame();
    const host = new GameHost<Ev, Cmd>(async () => game);
    expect(host.state).toBe("idle");
    const p = host.mount(container);
    expect(host.state).toBe("loading");
    await p;
    expect(host.state).toBe("running");
    expect(host.instance).toBe(game);
  });

  it("destroy() destroys the game, clears listeners and is idempotent", async () => {
    const game = fakeGame();
    const host = new GameHost<Ev, Cmd>(async () => game);
    host.events.on("ready", () => {});
    host.commands.on("go", () => {});
    await host.mount(container);
    host.destroy();
    host.destroy();
    expect(game.destroy).toHaveBeenCalledTimes(1);
    expect(game.destroy).toHaveBeenCalledWith(true);
    expect(host.events.listenerCount()).toBe(0);
    expect(host.commands.listenerCount()).toBe(0);
    expect(host.state).toBe("destroyed");
    expect(host.instance).toBeNull();
  });

  it("destroying before the engine has loaded still destroys it when it arrives", async () => {
    const d = deferredFactory();
    const host = new GameHost<Ev, Cmd>(d.factory);
    const mounting = host.mount(container);
    host.destroy();
    const game = fakeGame();
    d.resolve(game);
    await mounting;
    expect(game.destroy).toHaveBeenCalledTimes(1);
    expect(host.state).toBe("destroyed");
    expect(host.instance).toBeNull();
  });

  it("the signal given to the factory aborts on destroy", async () => {
    let seen: AbortSignal | undefined;
    const host = new GameHost<Ev, Cmd>(async (ctx) => {
      seen = ctx.signal;
      return fakeGame();
    });
    await host.mount(container);
    expect(seen!.aborted).toBe(false);
    host.destroy();
    expect(seen!.aborted).toBe(true);
  });
});

describe("one game at a time", () => {
  it("mounting a second host destroys the first", async () => {
    const g1 = fakeGame();
    const g2 = fakeGame();
    const h1 = new GameHost<Ev, Cmd>(async () => g1);
    const h2 = new GameHost<Ev, Cmd>(async () => g2);
    await h1.mount(container);
    await h2.mount(container);
    expect(g1.destroy).toHaveBeenCalledTimes(1);
    expect(h1.state).toBe("destroyed");
    expect(g2.destroy).not.toHaveBeenCalled();
    expect(h2.state).toBe("running");
  });

  it("re-mounting the same host destroys its previous game", async () => {
    const games = [fakeGame(), fakeGame()];
    let i = 0;
    const host = new GameHost<Ev, Cmd>(async () => games[i++]!);
    await host.mount(container);
    await host.mount(container);
    expect(games[0]!.destroy).toHaveBeenCalledTimes(1);
    expect(games[1]!.destroy).not.toHaveBeenCalled();
    expect(host.instance).toBe(games[1]);
  });

  it("a slow first mount that loses the race is destroyed, never used", async () => {
    const slow = deferredFactory();
    const fast = fakeGame();
    const h1 = new GameHost<Ev, Cmd>(slow.factory);
    const h2 = new GameHost<Ev, Cmd>(async () => fast);
    const p1 = h1.mount(container);
    await h2.mount(container); // destroys h1 while it is still loading
    const late = fakeGame();
    slow.resolve(late);
    await p1;
    expect(late.destroy).toHaveBeenCalledTimes(1);
    expect(h1.instance).toBeNull();
    expect(h2.instance).toBe(fast);
  });

  it("after destroy a new host can mount again", async () => {
    const h1 = new GameHost<Ev, Cmd>(async () => fakeGame());
    await h1.mount(container);
    h1.destroy();
    const g = fakeGame();
    const h2 = new GameHost<Ev, Cmd>(async () => g);
    await h2.mount(container);
    expect(g.destroy).not.toHaveBeenCalled();
  });
});

describe("failures", () => {
  it("a factory that throws leaves the host failed and frees the slot", async () => {
    const host = new GameHost<Ev, Cmd>(async () => {
      throw new Error("no webgl");
    });
    await expect(host.mount(container)).rejects.toThrow("no webgl");
    expect(host.state).toBe("failed");
    const g = fakeGame();
    const next = new GameHost<Ev, Cmd>(async () => g);
    await next.mount(container);
    expect(next.state).toBe("running");
  });

  it("an error while destroying the game is contained", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const bad = { destroy: vi.fn(() => { throw new Error("gl lost"); }) };
    const host = new GameHost<Ev, Cmd>(async () => bad);
    await host.mount(container);
    expect(() => host.destroy()).not.toThrow();
    expect(host.state).toBe("destroyed");
    spy.mockRestore();
  });

  it("a failure from a mount that was already replaced is ignored", async () => {
    const d = deferredFactory();
    const host = new GameHost<Ev, Cmd>(d.factory);
    const p = host.mount(container);
    host.destroy();
    d.reject(new Error("late failure"));
    await expect(p).resolves.toBeUndefined();
    expect(host.state).toBe("destroyed");
  });
});

describe("events and commands", () => {
  it("both channels reach the factory and the page", async () => {
    const got: string[] = [];
    const host = new GameHost<Ev, Cmd>(async (ctx) => {
      ctx.commands.on("go", () => got.push("game got go"));
      ctx.events.emit("ready", undefined);
      return fakeGame();
    });
    host.events.on("ready", () => got.push("page got ready"));
    await host.mount(container);
    host.commands.emit("go", undefined);
    expect(got).toEqual(["page got ready", "game got go"]);
  });
});
