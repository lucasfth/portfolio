export function apiError(status: number, code: string, message: string, headers?: HeadersInit) {
  return Response.json({ error: { code, message } }, { status, headers });
}

export function methodNotAllowed(allow: string) {
  return apiError(405, "method_not_allowed", "This endpoint only supports GET.", { Allow: allow });
}
