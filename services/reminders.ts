import { addDays } from 'date-fns';
import { Platform } from 'react-native';
import { formatTime, fromISODate, toISODate, today } from '@/utils/date';
import { loadNotifications } from '@/utils/permissions';
import { listHearings, type HearingRow } from './hearings';
import { listTasks } from './extras';
import type { ISODate, NotificationPrefs, Task } from './types';

/**
 * Hearing reminders (FR-NOTIF). They are scheduled on the phone, so they fire even with no signal
 * and need no server. Every time cases, hearings, tasks or the reminder settings change, the whole
 * schedule is rebuilt from the data for the next DAYS_AHEAD days.
 *
 * Reminders:
 *  - evening-before digest  (prefs.eveningTime, default 8 PM): tomorrow's hearings
 *  - morning-of digest      (prefs.morningTime, default 8 AM): today's hearings, in time order
 *  - 1 hour before a hearing that has a time (with the morning reminders)
 *  - tasks due              (morning time): open tasks due that day
 */

const DAYS_AHEAD = 14;
/** iOS keeps at most 64 pending local notifications; stay under it, nearest first. */
const MAX_SCHEDULED = 60;
const CHANNEL_ID = 'reminders';

type Planned = { at: Date; title: string; body: string; url: string };

const at = (day: ISODate, hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const d = fromISODate(day);
  d.setHours(h, m, 0, 0);
  return d;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "City Civil Court, 10:30 AM" for the first hearing of a day. */
const describe = (h: HearingRow) => [h.case.court?.name, h.time ? formatTime(h.time) : undefined].filter(Boolean).join(', ');

const byTime = (a: HearingRow, b: HearingRow) => (a.time ?? '99:99').localeCompare(b.time ?? '99:99');

function plan(prefs: NotificationPrefs, hearings: HearingRow[], tasks: Task[]): Planned[] {
  const out: Planned[] = [];
  const t0 = today();
  const days: ISODate[] = Array.from({ length: DAYS_AHEAD + 1 }, (_, i) => toISODate(addDays(t0, i)));

  for (const day of days) {
    const list = hearings.filter((h) => h.date === day && !h.completedAt).sort(byTime);

    if (list.length) {
      const first = list[0]!;
      if (prefs.eveningEnabled) {
        const prev = toISODate(addDays(fromISODate(day), -1));
        out.push({
          at: at(prev, prefs.eveningTime),
          title: plural(list.length, 'hearing tomorrow', 'hearings tomorrow'),
          body: list.length === 1 ? `${first.case.title}. ${describe(first)}` : `First: ${describe(first)}. ${first.case.title}`,
          url: '/(tabs)/calendar',
        });
      }
      if (prefs.morningEnabled) {
        const courts = [...new Set(list.map((h) => h.case.court?.name).filter(Boolean))];
        out.push({
          at: at(day, prefs.morningTime),
          title: plural(list.length, 'hearing today', 'hearings today'),
          body: courts.length ? `In order: ${courts.join(', ')}` : list.map((h) => h.case.title).join(', '),
          url: '/today',
        });
        for (const h of list.filter((x) => x.time)) {
          const start = at(day, h.time!);
          out.push({
            at: new Date(start.getTime() - 60 * 60 * 1000),
            title: `Hearing at ${formatTime(h.time!)}: ${h.case.title}`,
            body: [h.case.court?.name, h.courtRoom ? `Room ${h.courtRoom}` : undefined, h.purpose].filter(Boolean).join(' · '),
            url: `/case/${h.caseId}`,
          });
        }
      }
    }

    const due = tasks.filter((t) => !t.completedAt && t.dueDate === day);
    if (due.length && prefs.morningEnabled) {
      out.push({
        at: at(day, prefs.morningTime),
        title: due.length === 1 ? `Task due today: ${due[0]!.title}` : plural(due.length, 'task due today', 'tasks due today'),
        body: due.length === 1 ? 'Tap to open it.' : due.map((x) => x.title).join(', '),
        url: due.length === 1 && due[0]!.caseId ? `/case/${due[0]!.caseId}` : '/today',
      });
    }
  }

  const now = Date.now();
  return out.filter((p) => p.at.getTime() > now + 30_000).sort((a, b) => a.at.getTime() - b.at.getTime()).slice(0, MAX_SCHEDULED);
}

let running: Promise<void> | null = null;
let again = false;

/** Rebuilds every scheduled reminder. Safe to call often: overlapping calls collapse into one rerun. */
export async function rescheduleReminders(prefs: NotificationPrefs | undefined): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await rebuild(prefs);
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function rebuild(prefs: NotificationPrefs | undefined) {
  const N = loadNotifications();
  if (!N || Platform.OS === 'web') return;
  try {
    const perm = await N.getPermissionsAsync();
    if (!prefs || perm.status !== 'granted') {
      await N.cancelAllScheduledNotificationsAsync();
      return;
    }

    // Load first: if this fails (offline), the previous schedule stays in place.
    const from = toISODate(today());
    const to = toISODate(addDays(today(), DAYS_AHEAD));
    const [hearings, tasks] = await Promise.all([listHearings(from, to), listTasks()]);

    if (Platform.OS === 'android') {
      await N.setNotificationChannelAsync(CHANNEL_ID, { name: 'Hearing reminders', importance: N.AndroidImportance.HIGH });
    }
    await N.cancelAllScheduledNotificationsAsync();
    for (const p of plan(prefs, hearings, tasks)) {
      await N.scheduleNotificationAsync({
        content: { title: p.title, body: p.body, data: { url: p.url }, sound: 'default' },
        trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: CHANNEL_ID },
      });
    }
  } catch {
    // Offline or notifications unavailable (e.g. Expo Go): keep whatever was scheduled before.
  }
}

/** On sign-out: no reminders for an account that is no longer on this phone. */
export async function clearReminders() {
  const N = loadNotifications();
  if (!N || Platform.OS === 'web') return;
  await N.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
