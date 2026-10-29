export function retainLastGood(previous, next) {
  return next ?? previous;
}

export function refreshFailure(_previous, next) {
  return next ? null : "Request failed";
}
