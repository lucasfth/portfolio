import { apiError, methodNotAllowed } from "../api-error";
import { getGalleries, getGalleryImages } from "@/lib/content";

export async function GET(request: Request) {
 const id = new URL(request.url).searchParams.get("id");
 if (!id || !getGalleries().some(g => g.id === id)) return apiError(404, "gallery_not_found", "The requested gallery was not found.");
 const images = await getGalleryImages(id);
 return Response.json(images.map(img => ({ src: img.src, alt: img.alt, imageClassName: "h-48 w-64 object-cover sm:h-56 sm:w-72" })));
}

export function POST() { return methodNotAllowed("GET"); }
export const PUT = POST;
export const PATCH = POST;
export const DELETE = POST;
export const OPTIONS = POST;
export function HEAD() { return apiError(405, "method_not_allowed", "This endpoint only supports GET.", { Allow: "GET" }); }
