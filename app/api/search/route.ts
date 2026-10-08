import { getSearchItems } from "@/lib/search-content";
export function GET() { return Response.json(getSearchItems()); }
