import { describe, it, expect, mock } from "bun:test";
import { hedgedFetch } from "./hedgedFetch";

type Init = Parameters<typeof fetch>[1];

const URL = "https://fgv.test/api/horarios-prevision-3/78";

const ok = () => new Response("ok");

const hang = (init?: Init) =>
  new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
  });

const after = (ms: number, init: Init, value: () => Response) =>
  new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => resolve(value()), ms);
    init?.signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(init.signal?.reason);
    });
  });

function makeFetch(respond: (attempt: number, init: Init) => Promise<Response>) {
  const signals: AbortSignal[] = [];
  let attempts = 0;
  const fetchFn = mock((_url: string, init?: Init) => {
    attempts++;
    if (init?.signal) signals.push(init.signal);
    return respond(attempts, init);
  });
  return { fetchFn, signals, attempts: () => attempts };
}

function send(fetchFn: ReturnType<typeof makeFetch>["fetchFn"], deadlineMs = 500, hedgeMs = 30) {
  return hedgedFetch(fetchFn, hedgeMs)(URL, { signal: AbortSignal.timeout(deadlineMs) });
}

describe("hedgedFetch", () => {
  it("should not send a second request when the first answers before hedgeAfterMs", async () => {
    const { fetchFn, attempts } = makeFetch((_n, init) => after(5, init, ok));

    const response = await send(fetchFn);

    expect(await response.text()).toBe("ok");
    expect(attempts()).toBe(1);
  });

  it("should send a second request and return its answer when the first hangs", async () => {
    const { fetchFn, attempts } = makeFetch((n, init) =>
      n === 1 ? hang(init) : Promise.resolve(ok()),
    );

    const response = await send(fetchFn);

    expect(await response.text()).toBe("ok");
    expect(attempts()).toBe(2);
  });

  it("should abort the losing request once one answers", async () => {
    const { fetchFn, signals } = makeFetch((n, init) =>
      n === 1 ? hang(init) : Promise.resolve(ok()),
    );

    await send(fetchFn);

    expect(signals[0]!.aborted).toBe(true);
    expect(signals[1]!.aborted).toBe(false);
  });

  it("should keep the first answer when it arrives after the hedge was sent", async () => {
    const { fetchFn, attempts } = makeFetch((n, init) =>
      n === 1 ? after(50, init, ok) : hang(init),
    );

    const response = await send(fetchFn);

    expect(await response.text()).toBe("ok");
    expect(attempts()).toBe(2);
  });

  it("should use the hedged request when the first fails outright", async () => {
    const { fetchFn, attempts } = makeFetch((n) =>
      n === 1 ? Promise.reject(new TypeError("connection reset")) : Promise.resolve(ok()),
    );

    const response = await send(fetchFn);

    expect(await response.text()).toBe("ok");
    expect(attempts()).toBe(2);
  });

  it("should never send more than two attempts and give up at the caller's deadline", async () => {
    const { fetchFn, attempts } = makeFetch((_n, init) => hang(init));

    await expect(send(fetchFn, 100, 10)).rejects.toThrow();
    expect(attempts()).toBe(2);
  });

  it("should throw the first error when both attempts fail", async () => {
    const { fetchFn } = makeFetch((n) => Promise.reject(new TypeError(`failure ${n}`)));

    await expect(send(fetchFn)).rejects.toThrow("failure 1");
  });

  it("should hedge without a caller deadline", async () => {
    const { fetchFn, attempts } = makeFetch((n, init) =>
      n === 1 ? hang(init) : Promise.resolve(ok()),
    );

    const response = await hedgedFetch(fetchFn, 10)(URL);

    expect(await response.text()).toBe("ok");
    expect(attempts()).toBe(2);
  });
});
