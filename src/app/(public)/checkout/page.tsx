"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import { useBoundTable } from "@/components/table-binding";
import { lineTotal } from "@/lib/cart";
import { formatCents } from "@/lib/money";
import { submitOrder } from "./actions";

type FormValues = {
  customerName: string;
  customerPhone: string;
  mode: "DINE_IN" | "PICKUP";
  notes: string;
};

export default function CheckoutPage() {
  const { items, ready, subtotalCents, clear } = useCart();
  const router = useRouter();
  const [pending, start] = useTransition();
  const table = useBoundTable();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { mode: "PICKUP", customerName: "", customerPhone: "", notes: "" },
  });

  const mode = useWatch({ control, name: "mode" });

  if (!ready) return <div className="skeleton h-40" aria-busy="true" />;
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted mb-4">Seu carrinho está vazio.</p>
        <Link href="/" className="btn-primary">
          Ver cardápio
        </Link>
      </div>
    );
  }

  const onSubmit = handleSubmit((v) => {
    setServerError(null);
    start(async () => {
      const result = await submitOrder({
        customerName: v.customerName,
        customerPhone: v.customerPhone,
        mode: v.mode,
        tableCode: v.mode === "DINE_IN" ? table?.code : undefined,
        notes: v.notes || undefined,
        // Só ids e quantidades: o servidor define todos os preços.
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          note: i.note || undefined,
          optionIds: i.options.map((o) => o.id),
        })),
      });
      if (result.ok) {
        clear();
        toast.success("Pedido enviado!");
        router.push(`/pedido/${result.trackingToken}`);
        return;
      }
      setServerError(result.error);
      for (const [field, msgs] of Object.entries(result.fieldErrors ?? {})) {
        if (field in v) setError(field as keyof FormValues, { message: msgs[0] });
      }
    });
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-extrabold">Finalizar pedido</h1>
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="name" className="label">
            Nome
          </label>
          <input
            id="name"
            className="input"
            autoComplete="name"
            {...register("customerName", {
              required: "Informe seu nome.",
              minLength: { value: 2, message: "Nome muito curto." },
            })}
            aria-invalid={!!errors.customerName}
            aria-describedby={errors.customerName ? "name-error" : undefined}
          />
          {errors.customerName && (
            <p id="name-error" role="alert" className="field-error">
              {errors.customerName.message}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="phone" className="label">
            Telefone (com DDD)
          </label>
          <input
            id="phone"
            className="input"
            inputMode="tel"
            autoComplete="tel"
            placeholder="(11) 90000-0000"
            {...register("customerPhone", { required: "Informe seu telefone." })}
            aria-invalid={!!errors.customerPhone}
            aria-describedby={errors.customerPhone ? "phone-error" : undefined}
          />
          {errors.customerPhone && (
            <p id="phone-error" role="alert" className="field-error">
              {errors.customerPhone.message}
            </p>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="label">Como você quer receber?</legend>
          {(
            [
              ["PICKUP", "Retirada no estabelecimento"],
              ["DINE_IN", "Consumo no local"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="border-sand flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-white px-3"
            >
              <input
                type="radio"
                value={value}
                className="accent-terracotta size-4"
                {...register("mode")}
              />
              <span className="text-sm">{label}</span>
            </label>
          ))}
          {mode === "DINE_IN" &&
            (table ? (
              <p className="bg-olive/10 text-olive rounded-lg px-3 py-2 text-sm font-medium">
                Pedido para a {table.name}.
              </p>
            ) : (
              <p role="alert" className="field-error">
                Para consumir no local, leia o QR Code da sua mesa. Ou escolha retirada.
              </p>
            ))}
        </fieldset>

        <div>
          <label htmlFor="notes" className="label">
            Observações gerais (opcional)
          </label>
          <textarea
            id="notes"
            className="input min-h-20 py-2"
            maxLength={300}
            {...register("notes")}
          />
        </div>

        <section
          aria-label="Resumo do pedido"
          className="border-sand rounded-xl border bg-white p-4"
        >
          <h2 className="mb-2 font-bold">Resumo</h2>
          <ul className="space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.key} className="flex justify-between gap-3">
                <span>
                  {i.quantity}× {i.name}
                  {i.options.length
                    ? ` (${i.options.map((o) => o.name).join(", ")})`
                    : ""}
                </span>
                <span>{formatCents(lineTotal(i))}</span>
              </li>
            ))}
          </ul>
          <p className="border-sand mt-3 flex justify-between border-t pt-3 font-extrabold">
            <span>Total</span>
            <span>{formatCents(subtotalCents)}</span>
          </p>
          <p className="text-muted mt-2 text-xs">
            Pagamento não integrado nesta demonstração: o valor é pago no restaurante.
          </p>
        </section>

        {serverError && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={pending || (mode === "DINE_IN" && !table)}
        >
          {pending ? "Enviando…" : "Confirmar pedido"}
        </button>
      </form>
    </div>
  );
}
