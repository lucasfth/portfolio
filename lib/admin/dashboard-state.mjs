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
