export function parseCrossSellCategoryIds(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export type CrossSellSuggestion = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
};

type BookableCategoryLike = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
};

// The suggestions to show on the booking page's review step for whichever
// category the customer picked — staff-curated (see crossSellCategoryIds on
// EquipmentCategory), filtered down to whatever's actually still bookable
// right now so a suggestion never points at something sold out or unpriced.
export function getCrossSellSuggestions(
  category: { crossSellCategoryIds: string },
  bookableCategories: BookableCategoryLike[]
): CrossSellSuggestion[] {
  const ids = new Set(parseCrossSellCategoryIds(category.crossSellCategoryIds));
  return bookableCategories
    .filter((c) => ids.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, description: c.description, imageUrl: c.imageUrl }));
}
