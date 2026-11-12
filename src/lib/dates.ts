/** Início do dia atual em America/Sao_Paulo (UTC-3 fixo, sem horário de verão). */
export function startOfTodaySaoPaulo(now: Date = new Date()): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
    now,
  );
  return new Date(`${ymd}T00:00:00-03:00`);
}

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});
export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
