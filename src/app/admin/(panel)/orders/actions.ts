"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { errorUrl, type AdminErrorCode } from "@/lib/admin-errors";
import { canTransition, isOrderStatus } from "@/lib/order-status";
import { assertAdmin } from "@/server/admin-auth";

const schema = z.object({
  orderId: z.string().uuid(),
  to: z.string().refine(isOrderStatus),
});

/** Volta ao pedido com um código de erro conhecido (texto em lib/admin-errors). */
function backToOrder(orderId: string, error: AdminErrorCode): never {
  revalidatePath(`/admin/orders/${orderId}`);
  redirect(errorUrl(`/admin/orders/${orderId}`, error));
}

export async function updateOrderStatus(formData: FormData) {
  const { supabase } = await assertAdmin();
  const { orderId, to } = schema.parse(Object.fromEntries(formData));

  const { data: order } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .single();
  if (!order) redirect("/admin/orders");
  if (!isOrderStatus(order.status) || !canTransition(order.status, to as never)) {
    // Tela desatualizada ou clique duplo: outro admin já mudou o pedido.
    backToOrder(orderId, "pedido-status-invalido");
  }
  // Compara o status atual na escrita: se mudou entre a leitura e o update, nada é alterado.
  // O gatilho do banco valida a transição de novo e grava o histórico.
  const { data: updated, error } = await supabase
    .from("orders")
    .update({ status: to })
    .eq("id", orderId)
    .eq("status", order.status)
    .select("id");
  if (error || !updated || updated.length === 0) backToOrder(orderId, "pedido-mudou");

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin");
  redirect(`/admin/orders/${orderId}`);
}
