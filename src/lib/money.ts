const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formata centavos como "R$ 1.234,56". */
export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

/** Converte o valor `numeric` do Postgres (string ou number) em centavos inteiros. */
export function toCents(value: string | number): number {
  return Math.round(Number(value) * 100);
}

/** Converte centavos em string decimal para gravar em `numeric(10,2)`. */
export function fromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}
