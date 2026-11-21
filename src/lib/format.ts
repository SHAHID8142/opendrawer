export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return 'unknown size';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export function formatPoints(points: number): string {
  const mm = points * (25.4 / 72);
  return `${Math.round(points)} pt (${Math.round(mm)} mm)`;
}

/** Best-effort human name for a page size, used only as a hint next to the exact size. */
export function pageSizeName(width: number, height: number): string | null {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  const near = (a: number, b: number) => Math.abs(a - b) < 3;
  if (near(short, 595.28) && near(long, 841.89)) return 'A4';
  if (near(short, 612) && near(long, 792)) return 'US Letter';
  if (near(short, 419.53) && near(long, 595.28)) return 'A5';
  if (near(short, 297.64) && near(long, 419.53)) return 'A6';
  if (near(short, 841.89) && near(long, 1190.55)) return 'A3';
  if (near(short, 283.46) && near(long, 425.2)) return 'Business card';
  return null;
}
