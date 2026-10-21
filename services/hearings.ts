import type { HearingOutcome } from '@vakil/shared';
import { ApiError, notFound, unwrap } from './api';
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

export async function getHearing(id: string): Promise<HearingRow> {
  const row = await unwrap(supabase.from('hearings').select(HEARING_SELECT).eq('id', id).maybeSingle(), 'Hearing');
  if (!row) throw notFound('Hearing');
  return toHearingRow(row as unknown as HearingJoined);
}

/** outcomeNotes: the hearing's description (what happened, what to prepare). */
export type HearingInput = { date: ISODate; time?: string; purpose?: string; courtRoom?: string; itemNumber?: string; outcomeNotes?: string };

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
