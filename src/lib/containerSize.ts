export type ContainerFootprint = {
  lengthFt: number;
  widthFt: number;
  // True when the size came from the category's own dimensions field rather
  // than a rough default guessed from its name.
  exact: boolean;
};

type CategoryForSize = {
  name: string;
  dimensions: string | null;
  bundleQuantity: number | null;
};

// Reads sizes like "6'W x 12' L", "22 x 8 ft" or "12ft by 6ft" — the larger
// number is the length. Returns null when two numbers can't be found.
function parseDimensions(text: string): { lengthFt: number; widthFt: number } | null {
  const numbers = text.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (!numbers || numbers.length < 2) return null;
  const [a, b] = numbers;
  if (!(a > 0) || !(b > 0)) return null;
  return { lengthFt: Math.max(a, b), widthFt: Math.min(a, b) };
}

// Typical footprints by container size, used only when a category has no
// dimensions of its own. A business can set exact sizes on each category
// (Equipment > Categories) and those always win.
function defaultFootprintForYards(yards: number): { lengthFt: number; widthFt: number } {
  if (yards <= 10) return { lengthFt: 14, widthFt: 7 };
  if (yards <= 15) return { lengthFt: 16, widthFt: 7.5 };
  return { lengthFt: 22, widthFt: 8 };
}

// The ground footprint to draw for a category on the placement map. A bundle
// category (e.g. two containers rented together) is drawn side by side.
export function containerFootprint(category: CategoryForSize): ContainerFootprint {
  const copies = Math.max(1, category.bundleQuantity ?? 1);

  const parsed = category.dimensions ? parseDimensions(category.dimensions) : null;
  if (parsed) return { lengthFt: parsed.lengthFt, widthFt: parsed.widthFt * copies, exact: true };

  const yardsMatch = category.name.match(/(\d+)\s*(?:yd|yard|cu)/i);
  const yards = yardsMatch ? Number(yardsMatch[1]) : 20;
  // For a bundle named by its total ("40 Yard — Two Containers") size each
  // container from its share of the total.
  const perContainerYards = copies > 1 ? yards / copies : yards;
  const base = defaultFootprintForYards(perContainerYards);
  return { lengthFt: base.lengthFt, widthFt: base.widthFt * copies, exact: false };
}
