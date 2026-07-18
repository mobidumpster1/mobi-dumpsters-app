import { db } from "@/lib/db";

// Derives the next number from the highest existing Q-#### number, same
// approach as nextInvoiceNumber in src/lib/invoicing.ts — a count would
// drift out of sync whenever a draft quote gets deleted.
export async function nextQuoteNumber(organizationId: string): Promise<string> {
  const quotes = await db.quote.findMany({
    where: { organizationId, quoteNumber: { startsWith: "Q-" } },
    select: { quoteNumber: true },
  });
  const maxNumber = quotes.reduce((max, quote) => {
    const n = parseInt(quote.quoteNumber.slice(2), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `Q-${String(maxNumber + 1).padStart(4, "0")}`;
}
