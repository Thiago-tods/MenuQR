export type DayHours = { open: string; close: string } | null;
export type OpeningHours = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", DayHours>
>;

const KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
export const DAY_LABEL: Record<(typeof KEYS)[number], string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};
export const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Dia da semana e minutos do dia no fuso de São Paulo. */
function saoPauloParts(date: Date): { day: (typeof KEYS)[number]; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = get("weekday").toLowerCase().slice(0, 3) as (typeof KEYS)[number];
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Aberto agora, considerando horários que viram a meia-noite (ex.: 18:00–02:00)
 * e o turno do dia anterior que ainda não fechou.
 */
export function isOpenNow(hours: OpeningHours, now: Date = new Date()): boolean {
  const { day, minutes } = saoPauloParts(now);
  const today = hours[day];
  if (today) {
    const open = toMinutes(today.open);
    let close = toMinutes(today.close);
    if (close <= open) close += 24 * 60;
    if (minutes >= open && minutes < close) return true;
  }
  const prev = KEYS[(KEYS.indexOf(day) + 6) % 7];
  const yesterday = hours[prev];
  if (yesterday) {
    const open = toMinutes(yesterday.open);
    const close = toMinutes(yesterday.close);
    if (close <= open && minutes < close) return true;
  }
  return false;
}
