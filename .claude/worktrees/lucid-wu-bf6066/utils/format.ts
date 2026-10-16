/** Indian digit grouping: 1250000.5 -> "12,50,000.50" (FRS: INR, tabular numbers). */
export function groupINR(value: number, decimals: 0 | 2 = 0): string {
  const negative = value < 0;
  const [intPart = '0', frac] = Math.abs(value).toFixed(decimals).split('.');
  const last3 = intPart.slice(-3);
  const rest = intPart.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  return `${negative ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`;
}

export function formatINR(value: number, opts: { decimals?: 0 | 2 } = {}): string {
  return `₹${groupINR(value, opts.decimals ?? 0)}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Stable small hash for picking a tint from a name. */
export function hashIndex(seed: string, buckets: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % buckets;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "9876543210" -> "98765 43210" */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}
