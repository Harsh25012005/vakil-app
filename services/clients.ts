import { ApiError, notFound, unwrap } from './api';
import { CASE_SELECT, toCaseRow, type CaseJoined, type CaseRow } from './cases';
import { clientToRow, toClient, type Row } from './mappers';
import { supabase } from './supabase';
import type { Client } from './types';

export type ClientRow = Client & { caseCount: number; activeCaseCount: number };
export type ClientDetail = ClientRow & { cases: CaseRow[] };

/** Client + the status of each linked case, enough to count cases without a second query. */
const CLIENT_SELECT = '*, case_clients!case_clients_client_fkey(case:cases!case_clients_case_fkey(status, archived_at))';
type ClientJoined = Row<'clients'> & { case_clients: { case: Pick<Row<'cases'>, 'status' | 'archived_at'> | null }[] };

const toClientRow = (r: ClientJoined): ClientRow => {
  const live = r.case_clients.map((l) => l.case).filter((c) => c && !c.archived_at);
  return { ...toClient(r), caseCount: live.length, activeCaseCount: live.filter((c) => c!.status === 'active').length };
};

async function getClientRow(id: string): Promise<ClientRow> {
  const row = await unwrap(supabase.from('clients').select(CLIENT_SELECT).eq('id', id).maybeSingle(), 'Client');
  if (!row) throw notFound('Client');
  return toClientRow(row as unknown as ClientJoined);
}

export async function listClients(q?: string): Promise<ClientRow[]> {
  let query = supabase.from('clients').select(CLIENT_SELECT).order('full_name');
  // Inside or() PostgREST uses * as the wildcard and , ( ) " as syntax, so those are dropped from the input.
  const needle = q?.replace(/[,()*%\\"]/g, ' ').trim();
  if (needle) {
    const p = `*${needle}*`;
    query = query.or(`full_name.ilike.${p},phone.ilike.${p},email.ilike.${p}`);
  }
  const rows = await unwrap(query);
  return (rows as unknown as ClientJoined[]).map(toClientRow);
}

export async function getClient(id: string): Promise<ClientDetail> {
  const [client, links] = await Promise.all([getClientRow(id), unwrap(supabase.from('case_clients').select('case_id').eq('client_id', id))]);
  const ids = links.map((l) => l.case_id);
  const cases = ids.length
    ? ((await unwrap(supabase.from('cases').select(CASE_SELECT).in('id', ids).is('archived_at', null))) as unknown as CaseJoined[]).map(toCaseRow)
    : [];
  return { ...client, cases };
}

export type ClientInput = Omit<Client, 'id'>;

/** FR-CLI-01: a duplicate phone is a 409 carrying the existing client's id, so the UI can offer to open it. */
async function duplicatePhoneError(phone: string) {
  const dup = await unwrap(supabase.from('clients').select('id, full_name').eq('phone', phone.trim()).maybeSingle());
  return dup
    ? new ApiError(409, 'DUPLICATE_PHONE', `${dup.full_name} already uses this number`, { phone: dup.id })
    : new ApiError(409, 'DUPLICATE_PHONE', 'Another client already uses this number');
}

const isUniqueViolation = (e: unknown) => e instanceof ApiError && e.status === 409 && e.code === 'CONFLICT';

export async function createClient(input: ClientInput): Promise<ClientRow> {
  try {
    const row = await unwrap(
      supabase
        .from('clients')
        .insert({ ...clientToRow(input), full_name: input.fullName.trim(), phone: input.phone.trim() })
        .select('id')
        .single(),
      'Client',
    );
    return getClientRow(row.id);
  } catch (e) {
    if (isUniqueViolation(e)) throw await duplicatePhoneError(input.phone);
    throw e;
  }
}

export async function updateClient(id: string, patch: Partial<ClientInput>): Promise<ClientRow> {
  try {
    await unwrap(supabase.from('clients').update(clientToRow(patch)).eq('id', id), 'Client');
  } catch (e) {
    if (isUniqueViolation(e) && patch.phone) throw await duplicatePhoneError(patch.phone);
    throw e;
  }
  return getClientRow(id);
}

/** FR-CLI-06: only clients with no active cases can be deleted. Their case links cascade. */
export async function deleteClient(id: string) {
  const client = await getClientRow(id);
  const active = client.activeCaseCount;
  if (active > 0) throw new ApiError(409, 'HAS_ACTIVE_CASES', `This client has ${active} active ${active === 1 ? 'case' : 'cases'}. Close or reassign them first.`);
  await unwrap(supabase.from('clients').delete().eq('id', id), 'Client');
  return { id };
}
