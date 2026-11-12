import { NextResponse } from "next/server";
import { limitByClient } from "@/server/request-limit";
import { getTrackedOrder } from "@/server/tracking";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!limitByClient("track", req.headers, 60, 60_000)) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }
  const { token } = await params;
  const order = await getTrackedOrder(token);
  if (!order)
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}
