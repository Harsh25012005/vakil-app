import type { DisposalResult } from '@vakil/shared';
import { todayISO } from '@/utils/date';
import { ApiError, notFound, unwrap } from './api';
import { casePatchToRow, likePattern, toCase, toCaseType, toClient, toCourt, toHearing, type Row } from './mappers';
import { currentUserId, supabase } from './supabase';
import type { Case, CaseFilters, CaseStatus, CaseType, Client, Court, Hearing, NewCase } from './types';

/** A case with the related records every list row needs. */
export type CaseRow = Case & { court?: Court; caseType?: CaseType; clients: Client[]; overdue: boolean };
export type CaseDetail = CaseRow & { hearings: Hearing[] };

/** PostgREST select for a case row: court, case type and clients embedded through their foreign keys. */
export const CASE_SELECT =
  '*, court:courts!cases_court_fkey(*), case_type:case_types!cases_case_type_fkey(*), case_clients!case_clients_case_fkey(client:clients!case_clients_client_fkey(*))';

export type CaseJoined = Row<'cases'> & {
  court: Row<'courts'> | null;
  case_type: Row<'case_types'> | null;
  case_clients: { client: Row<'clients'> | null }[];
};

export function isOverdue(c: Pick<Case, 'status' | 'archivedAt' | 'nextHearingAt'>) {
  if (c.status !== 'active' || c.archivedAt) return false;
  return !c.nextHearingAt || c.nextHearingAt < todayISO();
}

export function toCaseRow(r: CaseJoined): CaseRow {
  const clients = r.case_clients.map((l) => l.client).filter((x): x is Row<'clients'> => !!x).map(toClient);
  const c = toCase(r, clients.map((x) => x.id));
  return { ...c, court: r.court ? toCourt(r.court) : undefined, caseType: r.case_type ? toCaseType(r.case_type) : undefined, clients, overdue: isOverdue(c) };
}

/** FR-CASE-05: title is composed from the parties when left blank. */
const composeTitle = (n: { title?: string; petitioner?: string; respondent?: string }) =>
  n.title?.trim() || [n.petitioner?.trim(), n.respondent?.trim()].filter(Boolean).join(' v. ') || 'Untitled case';

async function caseIdsForClient(clientId: string) {
  const links = await unwrap(supabase.from('case_clients').select('case_id').eq('client_id', clientId));
  return links.map((l) => l.case_id);
}

export async function listCases(f: CaseFilters = {}): Promise<CaseRow[]> {
  const t = todayISO();
  let q = supabase.from('cases').select(CASE_SELECT);

  q = f.archived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
  if (f.status && f.status !== 'all') {
    if (f.status === 'hearing_today') q = q.eq('status', 'active').eq('next_hearing_at', t);
    else if (f.status === 'overdue') q = q.eq('status', 'active').or(`next_hearing_at.is.null,next_hearing_at.lt.${t}`);
    else q = q.eq('status', f.status);
  }
  if (f.caseTypeId) q = q.eq('case_type_id', f.caseTypeId);
  if (f.courtId) q = q.eq('court_id', f.courtId);
  if (f.clientId) q = q.in('id', await caseIdsForClient(f.clientId));
  if (f.from) q = q.gte('next_hearing_at', f.from);
  if (f.to) q = q.lte('next_hearing_at', f.to);
  // search_text is a computed column (title, numbers, parties, court and client names).
  if (f.q?.trim()) q = q.ilike('search_text', likePattern(f.q));

  const rows = ((await unwrap(q)) as unknown as CaseJoined[]).map(toCaseRow);

  const sort = f.sort ?? 'next_date';
  const cmpTitle = (a: CaseRow, b: CaseRow) => a.title.localeCompare(b.title);
  if (sort === 'recent') return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === 'updated') return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (sort === 'title') return rows.sort(cmpTitle);
  // FR-CASE-07: overdue pinned on top, then by next date ascending, undated last.
  const rank = (c: CaseRow) => (c.overdue ? 0 : c.nextHearingAt ? 1 : 2);
  return rows.sort((a, b) => rank(a) - rank(b) || (a.nextHearingAt ?? '9').localeCompare(b.nextHearingAt ?? '9') || cmpTitle(a, b));
}

async function getCaseRow(id: string): Promise<CaseRow> {
  const row = await unwrap(supabase.from('cases').select(CASE_SELECT).eq('id', id).maybeSingle(), 'Case');
  if (!row) throw notFound('Case');
  return toCaseRow(row as unknown as CaseJoined);
}

export async function getCase(id: string): Promise<CaseDetail> {
  const [row, hearings] = await Promise.all([
    getCaseRow(id),
    unwrap(
      supabase
        .from('hearings')
        .select('*')
        .eq('case_id', id)
        .order('hearing_date', { ascending: false })
        .order('hearing_time', { ascending: false, nullsFirst: true }),
      'Case',
    ),
  ]);
  return { ...row, hearings: hearings.map(toHearing) };
}

/** Atomic: case + client links + first hearing in one RPC (create_case). */
export async function createCase(input: NewCase): Promise<CaseRow> {
  const id = await unwrap(
    supabase.rpc('create_case', {
      p_case: {
        title: composeTitle(input),
        case_number: input.caseNumber?.trim() || null,
        case_year: input.caseYear ?? null,
        cnr_number: input.cnr?.trim().toUpperCase() || null,
        case_type_id: input.caseTypeId,
        court_id: input.courtId,
        court_room: input.courtRoom?.trim() || null,
        judge_name: input.judge?.trim() || null,
        filing_date: input.filingDate ?? null,
        our_side: input.ourSide,
        petitioner_name: input.petitioner?.trim() || null,
        respondent_name: input.respondent?.trim() || null,
        opposite_counsel: input.oppositeCounsel?.trim() || null,
        stage: input.stage?.trim() || null,
        priority: input.priority,
        description: input.description?.trim() || null,
      },
      p_client_ids: input.clientIds,
      p_next_hearing_date: input.nextHearingDate,
      p_next_hearing_purpose: input.nextHearingPurpose?.trim() || undefined,
    }),
    'Case',
  );
  return getCaseRow(id);
}

/** Replaces the case's client links with exactly `clientIds`. */
async function setCaseClients(caseId: string, clientIds: string[]) {
  const current = await unwrap(supabase.from('case_clients').select('client_id').eq('case_id', caseId));
  const have = new Set(current.map((l) => l.client_id));
  const want = new Set(clientIds);
  const remove = [...have].filter((x) => !want.has(x));
  const add = [...want].filter((x) => !have.has(x));
  if (remove.length) await unwrap(supabase.from('case_clients').delete().eq('case_id', caseId).in('client_id', remove));
  if (add.length) await unwrap(supabase.from('case_clients').insert(add.map((client_id) => ({ case_id: caseId, client_id }))));
}

export async function updateCase(id: string, patch: Partial<Omit<Case, 'id'>>): Promise<CaseRow> {
  const { clientIds, ...fields } = patch;
  if ('title' in fields || 'petitioner' in fields || 'respondent' in fields) {
    const current = await getCaseRow(id);
    fields.title = composeTitle({ ...current, ...fields });
  }
  const row = casePatchToRow(fields);
  if (Object.keys(row).length) await unwrap(supabase.from('cases').update(row).eq('id', id), 'Case');
  if (clientIds) await setCaseClients(id, clientIds);
  return getCaseRow(id);
}

/** FR-CASE-13: Disposed requires a disposal date and result (also enforced by a check constraint). */
export async function changeCaseStatus(id: string, status: CaseStatus, disposal?: { date: string; result: DisposalResult }) {
  if (status === 'disposed' && !disposal) throw new ApiError(422, 'VALIDATION_ERROR', 'Disposal date and result are required', { disposalDate: 'Required' });
  await unwrap(
    supabase
      .from('cases')
      .update({
        status,
        disposal_date: status === 'disposed' ? disposal!.date : null,
        disposal_result: status === 'disposed' ? disposal!.result : null,
      })
      .eq('id', id),
    'Case',
  );
  return getCaseRow(id);
}

export async function archiveCase(id: string, archived: boolean) {
  await unwrap(supabase.from('cases').update({ archived_at: archived ? new Date().toISOString() : null }).eq('id', id), 'Case');
  return getCaseRow(id);
}

/**
 * FR-CASE-15: hearings, notes, documents, fees and tasks cascade in the database.
 * The case's files are removed from Storage first so nothing is orphaned.
 */
export async function deleteCase(id: string) {
  const uid = await currentUserId();
  if (uid) {
    const folder = `${uid}/${id}`;
    const { data: files } = await supabase.storage.from('case-docs').list(folder, { limit: 1000 });
    if (files?.length) await supabase.storage.from('case-docs').remove(files.map((f) => `${folder}/${f.name}`));
  }
  await unwrap(supabase.from('cases').delete().eq('id', id), 'Case');
  return { id };
}

/** FR-CASE-16: plain-text summary for the native share sheet. */
export const caseSummaryText = (c: CaseRow) =>
  [c.title, c.caseNumber && `Case no.: ${c.caseNumber}`, c.court && `Court: ${c.court.name}`, c.nextHearingAt && `Next date: ${c.nextHearingAt}`, c.stage && `Stage: ${c.stage}`]
    .filter(Boolean)
    .join('\n');
