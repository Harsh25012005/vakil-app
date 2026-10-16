import type { HearingOutcome } from '@vakil/shared';
import { ApiError, notFound, unwrap } from './api';
import { todayISO } from '@/utils/date';
import { CASE_SELECT, toCaseRow, type CaseJoined, type CaseRow } from './cases';
import { hearingToRow, toHearing, type Row } from './mappers';
import { supabase } from './supabase';
import type { Hearing, ISODate } from './types';

export type HearingRow = Hearing & { case: CaseRow; /** Outcome of the previous completed hearing, shown as "Last: Adjourned". */ lastOutcome?: HearingOutcome };

/**
 * Hearing + its (non-archived) case. last_outcome is a computed column; !inner drops hearings
 * whose case is filtered out by the archived_at condition.
 */
const HEARING_SELECT = `*, last_outcome, case:cases!hearings_case_fkey!inner(${CASE_SELECT})`;
type HearingJoined = Row<'hearings'> & { case: CaseJoined };

const toHearingRow = (r: HearingJoined): HearingRow => ({
  ...toHearing(r),
  lastOutcome: (r.last_outcome ?? undefined) as HearingOutcome | undefined,
  case: toCaseRow(r.case),
});

const liveHearings = () => supabase.from('hearings').select(HEARING_SELECT).is('case.archived_at', null);

const sorted = (q: ReturnType<typeof liveHearings>) =>
  q.order('hearing_date', { ascending: true }).order('hearing_time', { ascending: true, nullsFirst: false });

/** FR-CAL-01: hearings in a date range (inclusive), for the calendar and agenda. */
export async function listHearings(from: ISODate, to: ISODate): Promise<HearingRow[]> {
  const rows = await unwrap(sorted(liveHearings().gte('hearing_date', from).lte('hearing_date', to)));
  return (rows as unknown as HearingJoined[]).map(toHearingRow);
}

/** FR-HEAR-07: a hearing whose date passed with no outcome "needs update". */
export async function listNeedsUpdate(): Promise<HearingRow[]> {
  const rows = await unwrap(sorted(liveHearings().is('completed_at', null).lte('hearing_date', todayISO())));
  return (rows as unknown as HearingJoined[]).map(toHearingRow);
}

export async function getHearing(id: string): Promise<HearingRow> {
  const row = await unwrap(supabase.from('hearings').select(HEARING_SELECT).eq('id', id).maybeSingle(), 'Hearing');
  if (!row) throw notFound('Hearing');
  return toHearingRow(row as unknown as HearingJoined);
}

export type HearingInput = { date: ISODate; time?: string; purpose?: string; courtRoom?: string };

/** next_hearing_at / last_hearing_at on the case are updated by a database trigger. */
export async function addHearing(caseId: string, input: HearingInput): Promise<Hearing> {
  if (!input.date) throw new ApiError(422, 'VALIDATION_ERROR', 'Date is required', { date: 'Pick a date' });
  let courtRoom = input.courtRoom?.trim();
  if (!courtRoom) {
    const c = await unwrap(supabase.from('cases').select('court_room').eq('id', caseId).maybeSingle(), 'Case');
    if (!c) throw notFound('Case');
    courtRoom = c.court_room ?? undefined;
  }
  const row = await unwrap(
    supabase
      .from('hearings')
      .insert({ case_id: caseId, ...hearingToRow({ ...input, courtRoom }), hearing_date: input.date })
      .select('*')
      .single(),
    'Hearing',
  );
  return toHearing(row);
}

export async function updateHearing(id: string, patch: Partial<HearingInput>): Promise<Hearing> {
  const row = await unwrap(supabase.from('hearings').update(hearingToRow(patch)).eq('id', id).select('*').maybeSingle(), 'Hearing');
  if (!row) throw notFound('Hearing');
  return toHearing(row);
}

export async function deleteHearing(id: string): Promise<Hearing> {
  const row = await unwrap(supabase.from('hearings').delete().eq('id', id).select('*').maybeSingle(), 'Hearing');
  if (!row) throw notFound('Hearing');
  return toHearing(row);
}

export type OutcomeInput = {
  outcome: HearingOutcome;
  notes?: string;
  /** Skipped for "Order reserved" / "Disposed" (FR-HEAR-03/04). */
  next?: { date: ISODate; purpose?: string; time?: string };
};

/**
 * Closes the hearing and creates the next one atomically (FR-HEAR-04) via the record_outcome RPC.
 * "Order reserved" sets the case to Reserved for order.
 */
export async function recordOutcome(id: string, input: OutcomeInput) {
  const res = (await unwrap(
    supabase.rpc('record_outcome', {
      p_hearing_id: id,
      p_outcome: input.outcome,
      p_notes: input.notes?.trim() || undefined,
      p_next_date: input.next?.date || undefined,
      p_next_time: input.next?.time || undefined,
      p_next_purpose: input.next?.purpose?.trim() || undefined,
    }),
    'Hearing',
  )) as unknown as { hearing: Row<'hearings'>; next: Row<'hearings'> | null; caseId: string };
  return { hearing: toHearing(res.hearing), next: res.next ? toHearing(res.next) : undefined, caseId: res.caseId };
}

/** Undo for a deleted hearing (FRS 9.3): puts the exact row back, outcome included. */
export async function restoreHearing(h: Hearing): Promise<Hearing> {
  const row = await unwrap(
    supabase
      .from('hearings')
      .insert({ id: h.id, case_id: h.caseId, ...hearingToRow(h), hearing_date: h.date })
      .select('*')
      .single(),
    'Hearing',
  );
  return toHearing(row);
}
