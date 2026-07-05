import { EXPENSE_CATEGORIES } from "./expenseCategories";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-haiku-4-5-20251001";

export function isReceiptScanConfigured() {
  return Boolean(ANTHROPIC_API_KEY);
}

export type ScannedReceipt = {
  vendor: string;
  amount: number;
  date: string; // YYYY-MM-DD
  category: string;
};

// Sends a receipt photo to Claude's vision API and asks it to extract the
// vendor, total amount, date, and best-fit expense category as structured
// data (via forced tool use, so we always get valid JSON back).
export async function scanReceiptImage(
  base64Image: string,
  mediaType: string
): Promise<ScannedReceipt> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Receipt scanning isn't configured (missing ANTHROPIC_API_KEY)");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      tools: [
        {
          name: "record_receipt",
          description: "Records the extracted details of a business expense receipt.",
          input_schema: {
            type: "object",
            properties: {
              vendor: {
                type: "string",
                description: "The business/vendor name printed on the receipt",
              },
              amount: {
                type: "number",
                description: "The final total amount paid, in dollars",
              },
              date: {
                type: "string",
                description: "The transaction date in YYYY-MM-DD format",
              },
              category: {
                type: "string",
                enum: EXPENSE_CATEGORIES,
                description: "The best-fit expense category for this receipt",
              },
            },
            required: ["vendor", "amount", "date", "category"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "record_receipt" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64Image },
            },
            {
              type: "text",
              text: "Read this receipt and extract the vendor name, final total amount paid, transaction date, and the best-fit expense category. If the date is unclear or missing, use today's date. If the total is unclear, make your best estimate from the visible numbers.",
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Receipt scan failed: ${await response.text()}`);
  }

  const data = await response.json();
  const toolUse = (data.content as Array<{ type: string; input?: unknown }> | undefined)?.find(
    (block) => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("Could not read that receipt — try a clearer photo.");
  }

  const input = toolUse.input as {
    vendor?: string;
    amount?: number;
    date?: string;
    category?: string;
  };

  return {
    vendor: input.vendor?.trim() || "Unknown Vendor",
    amount: typeof input.amount === "number" ? input.amount : 0,
    date: input.date || new Date().toISOString().slice(0, 10),
    category: EXPENSE_CATEGORIES.includes(input.category ?? "")
      ? (input.category as string)
      : "Other",
  };
}
