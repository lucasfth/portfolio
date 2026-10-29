/**
 * Read a GET response completely under one timeout budget. Always returns
 * `{ response, body }`; body is null for non-2xx responses. Caller aborts are
 * terminal. Network/timeouts, 5xx responses, and invalid JSON on 2xx are retried.
 * @param {string | URL} url
 * @param {RequestInit} init
 * @param {{ attempts?: number, timeoutMs?: number }} options
 * @returns {Promise<{ response: Response, body: unknown }>}
 */
export async function fetchJsonWithRetry(url, init, { attempts = 3, timeoutMs = 10_000 } = {}) {
  if (init.method && init.method.toUpperCase() !== "GET") {
    throw new TypeError("fetchJsonWithRetry only supports GET");
  }
  const callerSignal = init.signal;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (callerSignal?.aborted) throw callerSignal.reason ?? new DOMException("Aborted", "AbortError");
    const controller = new AbortController();
    const abortFromCaller = () => controller.abort(callerSignal?.reason);
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
    const timer = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), timeoutMs);
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        if (response.status < 500 || attempt === attempts - 1) return { response, body: null };
        lastError = new Error(`HTTP ${response.status}`);
      } else {
        try {
          const body = await Promise.race([
            response.json(),
            new Promise((_, reject) => controller.signal.addEventListener("abort", () => reject(controller.signal.reason), { once: true })),
          ]);
          return { response, body };
        } catch (error) {
          if (callerSignal?.aborted) throw callerSignal.reason ?? error;
          lastError = error;
          if (attempt === attempts - 1) throw error;
        }
      }
    } catch (error) {
      if (callerSignal?.aborted) throw callerSignal.reason ?? error;
      lastError = error;
      if (attempt === attempts - 1) throw error;
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", abortFromCaller);
    }
    await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
  }
  throw lastError;
}
