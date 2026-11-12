import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { FoodImage } from "@/components/food-image";
import { ProductForm } from "@/components/product-form";
import { formatCents } from "@/lib/money";
import { getProductDetail } from "@/server/menu";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const product = await getProductDetail(id);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/"
        className="text-muted hover:text-charcoal inline-flex min-h-11 items-center gap-1 text-sm font-medium"
      >
        <ArrowLeft aria-hidden className="size-4" /> Voltar ao cardápio
      </Link>
      <FoodImage
        src={product.imageUrl}
        alt={product.name}
        className="aspect-[4/3] w-full rounded-2xl"
        priority
        sizes="(min-width: 768px) 672px, 100vw"
      />
      <div>
        <h1 className="text-2xl font-extrabold">{product.name}</h1>
        <p className="text-terracotta-ink mt-1 text-lg font-semibold">
          {formatCents(product.priceCents)}
        </p>
        {product.prepMinutes ? (
          <p className="text-muted mt-1 flex items-center gap-1 text-sm">
            <Clock aria-hidden className="size-4" /> Preparo em cerca de{" "}
            {product.prepMinutes} min
          </p>
        ) : null}
        <p className="text-muted mt-3">{product.description}</p>
      </div>
      <ProductForm product={product} />
    </div>
  );
}
