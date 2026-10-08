import { getGalleries, getGalleryImages } from "@/lib/content";
export async function GET(request: Request) {
 const id = new URL(request.url).searchParams.get("id");
 if (!id || !getGalleries().some(g => g.id === id)) return Response.json({ error: "Gallery not found" }, { status: 404 });
 const images = await getGalleryImages(id);
 return Response.json(images.map(img => ({ src: img.src, alt: img.alt, imageClassName: "h-48 w-64 object-cover sm:h-56 sm:w-72" })));
}
