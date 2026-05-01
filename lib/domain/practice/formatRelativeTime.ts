const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "data inválida";
  const diff = now.getTime() - then;
  if (diff < 0) return "agora";
  if (diff < MINUTE) return "agora";
  if (diff < HOUR) {
    const m = Math.floor(diff / MINUTE);
    return `há ${m} ${m === 1 ? "minuto" : "minutos"}`;
  }
  if (diff < DAY) {
    const h = Math.floor(diff / HOUR);
    return `há ${h} ${h === 1 ? "hora" : "horas"}`;
  }
  if (diff < WEEK) {
    const d = Math.floor(diff / DAY);
    return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  }
  const w = Math.floor(diff / WEEK);
  return `há ${w} ${w === 1 ? "semana" : "semanas"}`;
}
