"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface CatalogSearchProps {
  defaultQuery: string;
  categories: { id: string; name: string; slug: string }[];
  activeCategory: string;
  baseQs: string;
}

export function CatalogSearch({
  defaultQuery,
  categories,
  activeCategory,
  baseQs,
}: CatalogSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultQuery);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(baseQs);
    if (query) params.set("q", query);
    if (activeCategory) params.set("category", activeCategory);
    router.push(`/?${params.toString()}`);
  }

  function handleCategoryClick(slug: string) {
    const params = new URLSearchParams(baseQs);
    if (query) params.set("q", query);
    if (slug && slug !== activeCategory) {
      params.set("category", slug);
    }
    // If clicking active category, remove it (toggle off)
    router.push(`/?${params.toString()}`);
  }

  return (
    <div className="mb-6 space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search items..."
          className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Search
        </button>
      </form>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCategoryClick("")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !activeCategory
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.slug)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                activeCategory === cat.slug
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
