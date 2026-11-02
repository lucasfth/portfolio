export function createRequestCoordinator() {
  let generation = 0;
  let controller = null;
  return {
    begin() {
      controller?.abort();
      controller = new AbortController();
      const id = ++generation;
      return { id, signal: controller.signal };
    },
    isCurrent(id) { return id === generation && !controller?.signal.aborted; },
    cancel() { generation++; controller?.abort(); controller = null; },
  };
}

export function retainSuccessfulPayload(previous, candidate) {
  return candidate?.status === "ok" ? candidate : previous;
}

export function payloadRefreshError(candidate) {
  return candidate?.status === "ok" ? null : "Request failed";
}

export function panelPayloadResult(previous, candidate) {
  return { payload: retainSuccessfulPayload(previous, candidate), error: payloadRefreshError(candidate) };
}

export function reportReadResult(previous, result) {
  if (result.error || !Array.isArray(result.data)) return { reports: previous, error: "Overnight reports unavailable" };
  return { reports: result.data, error: null };
}

export function toggleExpanded(value) { return !value; }

export function githubRefreshErrorFor(candidate) {
  return candidate?.status === "error" && typeof candidate.message === "string" ? candidate.message : payloadRefreshError(candidate);
}

const weatherErrors = new Map([
  ['timeout', 'Weather provider timed out. Try again shortly.'],
  ['provider-http', 'Weather provider rejected the request. Try again shortly.'],
  ['provider-shape', 'Weather provider returned unreadable data. Try again shortly.'],
  ['transport', 'Weather connection failed. Try again shortly.'],
  ['access-denied', 'Weather access denied. Sign in again.'],
  ['request-timeout', 'Weather request timed out. Try again shortly.'],
  ['request-http', 'Weather request failed. Try again shortly.'],
]);
export function weatherFailure(category) {
  return {status:'error',category:weatherErrors.has(category) ? category : 'unavailable'};
}
export function weatherRefreshErrorFor(candidate) {
  return candidate?.status === 'ok' ? null : weatherErrors.get(candidate?.category) ?? 'Weather unavailable. Try again shortly.';
}

export function weatherExpired(weather, now = Date.now()) {
  const time = Date.parse(weather.updated);
  return !Number.isFinite(time) || now-time > 3600_000 || time-now > 900_000;
}
