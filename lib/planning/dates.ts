/** Datumhulp — kalenderdagen (demo-planning). */
export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function diffDays(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86400000) + 1);
}

export function formatDatumNl(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function maxDatum(...dates: string[]): string {
  return dates.reduce((a, b) => (a > b ? a : b));
}

export function minDatum(...dates: string[]): string {
  return dates.reduce((a, b) => (a < b ? a : b));
}

/** Maandag van ISO-week (bijv. W23-2026). */
export function weekToStartDate(weekStr: string, year = 2026): string | null {
  const m = weekStr.match(/W(\d{1,2})/i);
  if (!m) return null;
  const week = Number(m[1]);
  const jan4 = new Date(year, 0, 4);
  const day = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - day + 1 + (week - 1) * 7);
  return monday.toISOString().slice(0, 10);
}
