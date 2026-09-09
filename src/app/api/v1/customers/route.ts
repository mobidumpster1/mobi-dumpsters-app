import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authenticateApiRequest } from "@/lib/apiAuth";

// GET /api/v1/customers?limit=25&cursor=<customerId>
export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Invalid or missing API key." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25));
  const cursor = searchParams.get("cursor");

  const customers = await db.customer.findMany({
    where: { organizationId: auth.organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      name: true,
      companyName: true,
      phone: true,
      email: true,
      address: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    data: customers,
    nextCursor: customers.length === limit ? customers[customers.length - 1].id : null,
  });
}
