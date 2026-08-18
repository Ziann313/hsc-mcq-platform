export type SearchableContent = {
  title: string;
  subtitle?: string;
  keywords?: string[];
};

export function normaliseContentSearch(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function matchesContentSearch(item: SearchableContent, query: string) {
  const terms = normaliseContentSearch(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const haystack = normaliseContentSearch([item.title, item.subtitle ?? "", ...(item.keywords ?? [])].join(" "));
  return terms.every(term => haystack.includes(term));
}

export function filterContentBySearch<T extends SearchableContent>(items: T[], query: string) {
  return items.filter(item => matchesContentSearch(item, query));
}
