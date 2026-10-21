import { ApiError, notFound, unwrap } from './api';
import { toCaseType, toCourt } from './mappers';
import { supabase } from './supabase';
import { isOwnCourt, ownCourtId, type DirectoryCourt } from './ecourts';
import type { CaseType, Court } from './types';

/** FR-SET-03: courts and case types are editable lists. Hidden items stay on existing cases but leave pickers. */

export async function listCourts(opts: { includeHidden?: boolean } = {}): Promise<Court[]> {
  let q = supabase.from('courts').select('*').order('sort_order').order('created_at');
  if (!opts.includeHidden) q = q.eq('is_hidden', false);
  return (await unwrap(q)).map(toCourt);
}

export async function listCaseTypes(opts: { includeHidden?: boolean } = {}): Promise<CaseType[]> {
  let q = supabase.from('case_types').select('*').order('sort_order').order('created_at');
  if (!opts.includeHidden) q = q.eq('is_hidden', false);
  return (await unwrap(q)).map(toCaseType);
}

const clean = (name: string) => {
  const n = name.trim();
  if (n.length < 2) throw new ApiError(422, 'VALIDATION_ERROR', 'Enter at least 2 characters', { name: 'Too short' });
  return n;
};

const listPatch = (patch: { name?: string; isHidden?: boolean }) => {
  const out: { name?: string; is_hidden?: boolean } = {};
  if (patch.name !== undefined) out.name = clean(patch.name);
  if (patch.isHidden !== undefined) out.is_hidden = patch.isHidden;
  return out;
};

/** New items go to the end of the list. */
async function nextSortOrder(table: 'courts' | 'case_types') {
  const last = await unwrap(supabase.from(table).select('sort_order').order('sort_order', { ascending: false }).limit(1));
  return (last[0]?.sort_order ?? 0) + 1;
}

/** Idempotent: adding a court that already exists (any case) returns the existing one. */
export async function addCourt(name: string, city = ''): Promise<Court> {
  const n = clean(name);
  const existing = (await listCourts({ includeHidden: true })).find((c) => c.name.toLowerCase() === n.toLowerCase());
  if (existing) return existing;
  const row = await unwrap(supabase.from('courts').insert({ name: n, city, sort_order: await nextSortOrder('courts') }).select('*').single(), 'Court');
  return toCourt(row);
}

/**
 * The advocate's own court for a court picked from the all-India directory: the one already linked
 * to it, else one with the same name (linked now), else a new one. Hidden courts come back.
 */
export async function courtFromDirectory(d: DirectoryCourt): Promise<Court> {
  const all = await listCourts({ includeHidden: true });
  // A court the advocate added themself: that very court (shown again if it was hidden).
  if (isOwnCourt(d)) {
    const own = all.find((c) => c.id === ownCourtId(d));
    if (!own) throw notFound('Court');
    return own.isHidden ? updateCourt(own.id, { isHidden: false }) : own;
  }
  const have = all.find((c) => c.directoryId === d.id) ?? all.find((c) => c.name.toLowerCase() === d.name.toLowerCase());
  const scope = {
    directory_id: d.id,
    level: d.level,
    // High Courts: the comma-separated states they serve (courts.state_code comment).
    state_code: d.stateCodes.join(',') || null,
    district_code: d.districtCode ?? null,
    court_code: d.courtCodes.join(',') || null,
    city: d.bench ?? d.districtName ?? '',
    is_hidden: false,
  };
  if (have) {
    const row = await unwrap(supabase.from('courts').update(scope).eq('id', have.id).select('*').single(), 'Court');
    return toCourt(row);
  }
  const row = await unwrap(supabase.from('courts').insert({ name: clean(d.name).slice(0, 120), sort_order: await nextSortOrder('courts'), ...scope }).select('*').single(), 'Court');
  return toCourt(row);
}

export async function updateCourt(id: string, patch: Partial<Pick<Court, 'name' | 'isHidden'>>): Promise<Court> {
  const row = await unwrap(
    supabase
      .from('courts')
      .update(listPatch(patch))
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'Court',
  );
  if (!row) throw notFound('Court');
  return toCourt(row);
}

export async function moveCourt(id: string, dir: -1 | 1): Promise<Court[]> {
  await unwrap(supabase.rpc('move_list_item', { p_list: 'courts', p_id: id, p_dir: dir }));
  return listCourts({ includeHidden: true });
}

export async function addCaseType(name: string): Promise<CaseType> {
  const n = clean(name);
  const existing = (await listCaseTypes({ includeHidden: true })).find((c) => c.name.toLowerCase() === n.toLowerCase());
  if (existing) return existing;
  const row = await unwrap(supabase.from('case_types').insert({ name: n, sort_order: await nextSortOrder('case_types') }).select('*').single(), 'Case type');
  return toCaseType(row);
}

export async function updateCaseType(id: string, patch: { name?: string; isHidden?: boolean }): Promise<CaseType> {
  const row = await unwrap(
    supabase
      .from('case_types')
      .update(listPatch(patch))
      .eq('id', id)
      .select('*')
      .maybeSingle(),
    'Case type',
  );
  if (!row) throw notFound('Case type');
  return toCaseType(row);
}

export async function moveCaseType(id: string, dir: -1 | 1): Promise<CaseType[]> {
  await unwrap(supabase.rpc('move_list_item', { p_list: 'case_types', p_id: id, p_dir: dir }));
  return listCaseTypes({ includeHidden: true });
}

/** Courts offered during onboarding (FR-ONB-03). Custom courts can be added on top. */
export const COURT_SUGGESTIONS = [
  'City Civil Court, Ahmedabad',
  'Metropolitan Magistrate Court',
  'Family Court, Ahmedabad',
  'Gujarat High Court',
  'Sessions Court, Gandhinagar',
  'Consumer Commission, Surat',
  'District Court, Vadodara',
  'District Court, Rajkot',
  'Labour Court, Ahmedabad',
  'Debts Recovery Tribunal',
  'Revenue Tribunal',
  'Motor Accident Claims Tribunal',
];

/** FR-ONB-02: chosen courts become visible; the rest are hidden (never deleted, existing cases keep them). */
export async function setPrimaryCourts(names: string[]): Promise<Court[]> {
  if (names.length === 0) throw new ApiError(422, 'VALIDATION_ERROR', 'Pick at least one court', { courts: 'Required' });
  const wanted = new Map(names.map((n) => [n.trim().toLowerCase(), n.trim()]));
  const courts = await listCourts({ includeHidden: true });
  const show = courts.filter((c) => wanted.has(c.name.toLowerCase())).map((c) => c.id);
  const hide = courts.filter((c) => !wanted.has(c.name.toLowerCase())).map((c) => c.id);
  if (show.length) await unwrap(supabase.from('courts').update({ is_hidden: false }).in('id', show));
  if (hide.length) await unwrap(supabase.from('courts').update({ is_hidden: true }).in('id', hide));
  const have = new Set(courts.map((c) => c.name.toLowerCase()));
  for (const [key, name] of wanted) if (!have.has(key)) await addCourt(name);
  return listCourts({ includeHidden: true });
}
