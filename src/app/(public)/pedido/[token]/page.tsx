import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { OrderTracker } from "@/components/order-tracker";
import { getTrackedOrder } from "@/server/tracking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Acompanhar pedido",
  robots: { index: false },
};

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getTrackedOrder(token);
  if (!order) notFound();
  return <OrderTracker token={token} initial={order} />;
}
