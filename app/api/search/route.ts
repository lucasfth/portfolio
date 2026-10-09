import { apiError, methodNotAllowed } from "../api-error";
import { getSearchItems } from "@/lib/search-content";

export function GET() {
  return Response.json(getSearchItems());
}

export function POST() { return methodNotAllowed("GET"); }
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
export const OPTIONS = POST;
export function HEAD() { return apiError(405, "method_not_allowed", "This endpoint only supports GET.", { Allow: "GET" }); }
