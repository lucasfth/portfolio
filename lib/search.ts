export interface SearchItem {
  title: string;
  href: string;
  description?: string;
  external?: boolean;
  searchText?: string;
}

export function searchItems(items: SearchItem[], query: string): SearchItem[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return items
    .filter((item) => {
      const text = `${item.title} ${item.description || ""} ${item.searchText || ""}`.toLowerCase();
      return terms.every((term) => text.includes(term));
    })
    .slice(0, 8);
}
