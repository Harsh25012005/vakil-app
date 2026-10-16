import type { DisposalResult, DocumentCategory, HearingOutcome, OurSide, PaymentMode, Priority, Theme } from '@vakil/shared';
import { DEFAULT_REMINDERS } from '@vakil/shared';
import type { Database } from './database.types';
import type { Advocate, AppNotification, Case, CaseDocument, CaseStatus, CaseType, Client, Court, Hearing, NotificationPrefs, Note, Payment, Task } from './types';

/**
 * Database rows are snake_case and use null; the app's domain types (services/types.ts) are
 * camelCase and use undefined. Every conversion between the two lives here.
 */

type Tables = Database['public']['Tables'];
export type Row<T extends keyof Tables> = Tables[T]['Row'];

const opt = <T>(v: T | null | undefined): T | undefined => (v == null ? undefined : v);
/** Postgres time is 'HH:MM:SS'; the app uses 'HH:mm'. */
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : undefined);

export const toCourt = (r: Row<'courts'>): Court => ({ id: r.id, name: r.name, city: r.city, isHidden: r.is_hidden });
export const toCaseType = (r: Row<'case_types'>): CaseType => ({ id: r.id, name: r.name, isHidden: r.is_hidden });

export const toClient = (r: Row<'clients'>): Client => ({
  id: r.id,
  fullName: r.full_name,
  phone: r.phone,
  altPhone: opt(r.alt_phone),
  email: opt(r.email),
  address: opt(r.address),
  notes: opt(r.notes),
});

export const clientToRow = (c: Partial<Omit<Client, 'id'>>) => {
  const out: Partial<Tables['clients']['Insert']> = {};
  if ('fullName' in c) out.full_name = c.fullName?.trim();
  if ('phone' in c) out.phone = c.phone?.trim();
  if ('altPhone' in c) out.alt_phone = c.altPhone?.trim() || null;
  if ('email' in c) out.email = c.email?.trim() || null;
  if ('address' in c) out.address = c.address?.trim() || null;
  if ('notes' in c) out.notes = c.notes?.trim() || null;
  return out;
};

export const toCase = (r: Row<'cases'>, clientIds: string[]): Case => ({
  id: r.id,
  title: r.title,
  caseNumber: opt(r.case_number),
  caseYear: opt(r.case_year),
  cnr: opt(r.cnr_number),
  caseTypeId: r.case_type_id,
  courtId: r.court_id,
  courtRoom: opt(r.court_room),
  judge: opt(r.judge_name),
  filingDate: opt(r.filing_date),
  ourSide: r.our_side as OurSide,
  petitioner: opt(r.petitioner_name),
  respondent: opt(r.respondent_name),
  oppositeCounsel: opt(r.opposite_counsel),
  clientIds,
  stage: opt(r.stage),
  status: r.status as CaseStatus,
  disposalDate: opt(r.disposal_date),
  disposalResult: opt(r.disposal_result) as DisposalResult | undefined,
  priority: r.priority as Priority,
  description: opt(r.description),
  nextHearingAt: r.next_hearing_at,
  lastHearingAt: r.last_hearing_at,
  archivedAt: r.archived_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

/** Case fields the app may write, camelCase -> column. Hearing dates are trigger-managed, never written. */
const CASE_COLUMNS = {
  title: 'title',
  caseNumber: 'case_number',
  caseYear: 'case_year',
  cnr: 'cnr_number',
  caseTypeId: 'case_type_id',
  courtId: 'court_id',
  courtRoom: 'court_room',
  judge: 'judge_name',
  filingDate: 'filing_date',
  ourSide: 'our_side',
  petitioner: 'petitioner_name',
  respondent: 'respondent_name',
  oppositeCounsel: 'opposite_counsel',
  stage: 'stage',
  status: 'status',
  disposalDate: 'disposal_date',
  disposalResult: 'disposal_result',
  priority: 'priority',
  description: 'description',
  archivedAt: 'archived_at',
} as const satisfies Partial<Record<keyof Case, keyof Tables['cases']['Update']>>;

/** Only keys present in the patch are written; an explicit undefined clears the column. */
export function casePatchToRow(patch: Partial<Case>): Tables['cases']['Update'] {
  const out: Record<string, unknown> = {};
  for (const [k, col] of Object.entries(CASE_COLUMNS)) {
    if (k in patch) out[col] = (patch as Record<string, unknown>)[k] ?? null;
  }
  return out as Tables['cases']['Update'];
}

export const toHearing = (r: Row<'hearings'>): Hearing => ({
  id: r.id,
  caseId: r.case_id,
  date: r.hearing_date,
  time: hhmm(r.hearing_time),
  purpose: opt(r.purpose),
  courtRoom: opt(r.court_room),
  outcome: opt(r.outcome) as HearingOutcome | undefined,
  outcomeNotes: opt(r.outcome_notes),
  completedAt: opt(r.completed_at),
});

export const hearingToRow = (h: Partial<Omit<Hearing, 'id' | 'caseId'>>) => {
  const out: Tables['hearings']['Update'] = {};
  if ('date' in h) out.hearing_date = h.date;
  if ('time' in h) out.hearing_time = h.time || null;
  if ('purpose' in h) out.purpose = h.purpose?.trim() || null;
  if ('courtRoom' in h) out.court_room = h.courtRoom?.trim() || null;
  if ('outcome' in h) out.outcome = h.outcome ?? null;
  if ('outcomeNotes' in h) out.outcome_notes = h.outcomeNotes ?? null;
  if ('completedAt' in h) out.completed_at = h.completedAt ?? null;
  return out;
};

export const toNote = (r: Row<'notes'>): Note => ({
  id: r.id,
  caseId: r.case_id,
  title: opt(r.title),
  body: r.body,
  isPinned: r.is_pinned,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const toDocument = (r: Row<'documents'>, uri?: string): CaseDocument => ({
  id: r.id,
  caseId: r.case_id,
  fileName: r.file_name,
  category: r.category as DocumentCategory,
  mimeType: r.mime_type,
  sizeBytes: r.size_bytes,
  uri,
  createdAt: r.created_at,
});

export const toPayment = (r: Row<'payments'>): Payment => ({
  id: r.id,
  caseId: r.case_id,
  amount: Number(r.amount),
  paidOn: r.paid_on,
  mode: r.mode as PaymentMode,
  note: opt(r.note),
});

export const toTask = (r: Row<'tasks'>): Task => ({
  id: r.id,
  caseId: r.case_id,
  title: r.title,
  dueDate: opt(r.due_date),
  completedAt: opt(r.completed_at),
});

export const toNotification = (r: Row<'notifications'>): AppNotification => ({
  id: r.id,
  type: r.type as AppNotification['type'],
  title: r.title,
  body: r.body,
  deepLink: opt(r.deep_link),
  readAt: r.read_at,
  createdAt: r.created_at,
});

const DEFAULT_PREFS: NotificationPrefs = {
  eveningEnabled: true,
  eveningTime: DEFAULT_REMINDERS.evening,
  morningEnabled: true,
  morningTime: DEFAULT_REMINDERS.morning,
  needsUpdateEnabled: true,
};

export const toAdvocate = (r: Row<'advocates'>): Advocate => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email ?? '',
  enrolmentNo: opt(r.enrolment_no),
  practiceAreas: r.practice_areas,
  avatarUri: opt(r.avatar_url),
  theme: r.theme as Theme,
  notificationPrefs: { ...DEFAULT_PREFS, ...(r.notification_prefs as Partial<NotificationPrefs>) },
  onboardedAt: r.onboarded_at,
});

/** Profile fields the app may update (matches the column grants on public.advocates). */
export function advocatePatchToRow(p: Partial<Advocate>): Tables['advocates']['Update'] {
  const out: Tables['advocates']['Update'] = {};
  if ('fullName' in p) out.full_name = p.fullName?.trim() ?? '';
  if ('enrolmentNo' in p) out.enrolment_no = p.enrolmentNo?.trim() || null;
  if ('practiceAreas' in p) out.practice_areas = p.practiceAreas ?? [];
  if ('avatarUri' in p) out.avatar_url = p.avatarUri ?? null;
  if ('theme' in p) out.theme = p.theme;
  if ('notificationPrefs' in p) out.notification_prefs = p.notificationPrefs;
  if ('onboardedAt' in p) out.onboarded_at = p.onboardedAt;
  return out;
}

/** Escapes LIKE wildcards so user input is matched literally. */
export const likePattern = (q: string) => `%${q.trim().replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
