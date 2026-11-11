import type { FgvFetch } from "./FgvApiClient";

/** Resends a request still unanswered after `hedgeAfterMs`; first answer wins, the other is
 *  aborted. The caller's signal is the deadline for both attempts — see ./NOTES.md. */
export function hedgedFetch(fetchFn: FgvFetch, hedgeAfterMs: number): FgvFetch {
  return async (url, init) => {
    const deadline = init?.signal;
    const first = new AbortController();
    const second = new AbortController();
    const withDeadline = (attempt: AbortController) =>
      deadline ? AbortSignal.any([deadline, attempt.signal]) : attempt.signal;
    const request = (attempt: AbortController) =>
      fetchFn(url, { ...init, signal: withDeadline(attempt) });

    const firstRequest = request(first);
    const secondRequest = delay(hedgeAfterMs, withDeadline(second)).then(() => request(second));

    try {
      const winner = await Promise.any([
        firstRequest.then((response) => ({ response, loser: second })),
        secondRequest.then((response) => ({ response, loser: first })),
      ]);
      winner.loser.abort();
      return winner.response;
    } catch (error) {
      throw (error as AggregateError).errors[0];
    }
  };
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason);
    });
  });
}
