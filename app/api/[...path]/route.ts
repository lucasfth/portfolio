import { apiError } from "../api-error";

const message = "The requested public API endpoint was not found.";
function notFound() { return apiError(404, "api_not_found", message); }

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
