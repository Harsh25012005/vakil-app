import { addDays, addMonths, addWeeks, differenceInCalendarDays, format, isBefore, isSameDay, parseISO, startOfDay } from 'date-fns';

/** All dates are IST calendar dates as 'YYYY-MM-DD' (FRS 8 conventions). */
export type ISODate = string;

export const toISODate = (d: Date): ISODate => format(d, 'yyyy-MM-dd');
export const fromISODate = (s: ISODate): Date => parseISO(s);
export const today = (): Date => startOfDay(new Date());
/** Today as 'YYYY-MM-DD'. */
export const todayISO = (): ISODate => toISODate(today());

/** "12 Nov 2026, Thu" (CMP-12 field format). */
export const formatLongDate = (s: ISODate) => format(fromISODate(s), 'dd MMM yyyy, EEE');
export const formatShortDate = (s: ISODate) => format(fromISODate(s), 'dd MMM yyyy');
export const formatDayMonth = (s: ISODate) => format(fromISODate(s), 'dd MMM');

export const isPastDate = (s: ISODate) => isBefore(fromISODate(s), today());
export const isTodayDate = (s: ISODate) => isSameDay(fromISODate(s), today());

/** "14:30" -> "2:30 PM" */
export function formatTime(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const quickDates = [
  { key: 'today', label: 'Today', get: () => today() },
  { key: 'tomorrow', label: 'Tomorrow', get: () => addDays(today(), 1) },
  { key: '1w', label: '+1 week', get: () => addWeeks(today(), 1) },
  { key: '2w', label: '+2 weeks', get: () => addWeeks(today(), 2) },
  { key: '1m', label: '+1 month', get: () => addMonths(today(), 1) },
] as const;

/** "Today", "Tomorrow", "In 6 days", "4 days ago": used on next-date cards and overdue labels. */
export function relativeDay(iso: ISODate): string {
  const diff = differenceInCalendarDays(fromISODate(iso), today());
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return diff > 0 ? `In ${diff} days` : `${-diff} days ago`;
}
