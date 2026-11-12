/**
 * Cálculo de pedido 100% puro. O servidor carrega o catálogo do banco e chama
 * `priceOrder`; valores vindos do cliente nunca entram no cálculo.
 */

export const MAX_QUANTITY = 20;

export type CatalogOption = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
};

export type CatalogGroup = {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  options: CatalogOption[];
};

export type CatalogProduct = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  groups: CatalogGroup[];
};

export type CartLineInput = {
  productId: string;
  quantity: number;
  note?: string;
  optionIds: string[];
};

export type PricedLine = {
  productId: string;
  productName: string;
  unitPriceCents: number;
  quantity: number;
  note: string | null;
  options: { optionId: string; groupName: string; name: string; priceCents: number }[];
  lineTotalCents: number;
};

export type PricedOrder = {
  lines: PricedLine[];
  subtotalCents: number;
  totalCents: number;
};

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

export function priceOrder(
  lines: CartLineInput[],
  catalog: Map<string, CatalogProduct>,
): PricedOrder {
  if (lines.length === 0) throw new PricingError("O carrinho está vazio.");

  const priced = lines.map((line) => priceLine(line, catalog));
  const subtotalCents = priced.reduce((sum, l) => sum + l.lineTotalCents, 0);
  return { lines: priced, subtotalCents, totalCents: subtotalCents };
}

function priceLine(
  line: CartLineInput,
  catalog: Map<string, CatalogProduct>,
): PricedLine {
  if (
    !Number.isInteger(line.quantity) ||
    line.quantity < 1 ||
    line.quantity > MAX_QUANTITY
  ) {
    throw new PricingError(`Quantidade deve estar entre 1 e ${MAX_QUANTITY}.`);
  }
  const product = catalog.get(line.productId);
  if (!product) throw new PricingError("Produto não encontrado.");
  if (!product.available) throw new PricingError(`"${product.name}" está indisponível.`);

  const unique = new Set(line.optionIds);
  if (unique.size !== line.optionIds.length) {
    throw new PricingError("Complementos duplicados.");
  }

  const options: PricedLine["options"] = [];
  const countPerGroup = new Map<string, number>();

  for (const optionId of unique) {
    const group = product.groups.find((g) => g.options.some((o) => o.id === optionId));
    const option = group?.options.find((o) => o.id === optionId);
    if (!group || !option)
      throw new PricingError("Complemento inválido para este produto.");
    if (!option.available) throw new PricingError(`"${option.name}" está indisponível.`);
    countPerGroup.set(group.id, (countPerGroup.get(group.id) ?? 0) + 1);
    options.push({
      optionId: option.id,
      groupName: group.name,
      name: option.name,
      priceCents: option.priceCents,
    });
  }

  for (const group of product.groups) {
    const count = countPerGroup.get(group.id) ?? 0;
    if (count < group.minSelect) {
      throw new PricingError(`Selecione ao menos ${group.minSelect} em "${group.name}".`);
    }
    if (count > group.maxSelect) {
      throw new PricingError(
        `Selecione no máximo ${group.maxSelect} em "${group.name}".`,
      );
    }
  }

  const extras = options.reduce((sum, o) => sum + o.priceCents, 0);
  const unitPriceCents = product.priceCents + extras;
  const note = line.note?.trim() ? line.note.trim().slice(0, 200) : null;

  return {
    productId: product.id,
    productName: product.name,
    unitPriceCents,
    quantity: line.quantity,
    note,
    options,
    lineTotalCents: unitPriceCents * line.quantity,
  };
}
