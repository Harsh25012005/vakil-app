import { FunctionsHttpError } from '@supabase/supabase-js';
import { ApiError, errorMessage, unwrap } from './api';
import { supabase } from './supabase';
import { tribunalOnEcourts } from '@/utils/caseTypes';
import type { Court, EcourtsOrderRef, ISODate } from './types';

/** A case as returned by the ecourts-case Edge Function (eCourtsIndia data, normalised). */
export type EcourtsCase = {
  cnr: string;
  caseNumber?: string;
  filingNumber?: string;
  caseYear?: number;
  caseType?: string;
  caseTypeCode?: string;
  filingDate?: ISODate;
  registrationDate?: ISODate;
  petitioners: string[];
  respondents: string[];
  petitionerAdvocates: string[];
  respondentAdvocates: string[];
  judge?: string;
  courtName?: string;
  courtNo?: string;
  district?: string;
  state?: string;
  status?: string;
  stage?: string;
  decisionDate?: ISODate;
  disposal?: string;
  nextHearingDate?: ISODate;
  lastHearingDate?: ISODate;
  hearings: { date: ISODate; purpose?: string; judge?: string; business?: string }[];
  orders: EcourtsOrderRef[];
  updatedAt?: string;
};

/** Turns an Edge Function failure into an ApiError with the function's own message. */
async function invokeError(error: unknown): Promise<never> {
  if (error instanceof FunctionsHttpError) {
    const res = error.context as Response;
    const text = await res.text().catch(() => '');
    let body: { error?: { code?: string; message?: string } } | null = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* not JSON: a crash or timeout page */
    }
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'ECOURTS_ERROR',
      body?.error?.message ?? `Couldn't reach eCourts (server error ${res.status}${text ? `: ${text.slice(0, 80)}` : ''}).`,
    );
  }
  throw new ApiError(0, 'NETWORK', /fetch|network/i.test(errorMessage(error)) ? "Can't reach the server. Check your connection and try again." : errorMessage(error));
}

/**
 * FR-CASE-03: looks a case up on eCourts by its 16-character CNR. The API key stays in the
 * ecourts-case Edge Function; the app only sends the CNR with the user's session.
 */
// Each eCourts lookup costs a credit: reuse a result (or an in-flight request) for the same CNR
// for a few minutes, e.g. when the screen re-renders or the user re-types the same number.
const CACHE_MS = 10 * 60 * 1000;
const recent = new Map<string, { at: number; result: Promise<EcourtsCase> }>();

export function fetchCaseByCnr(cnr: string, opts: { fresh?: boolean } = {}): Promise<EcourtsCase> {
  const hit = recent.get(cnr);
  if (!opts.fresh && hit && Date.now() - hit.at < CACHE_MS) return hit.result;
  const result = lookup(cnr, !!opts.fresh);
  recent.set(cnr, { at: Date.now(), result });
  result.catch(() => recent.delete(cnr)); // failures are retried, not cached
  return result;
}

async function lookup(cnr: string, fresh: boolean): Promise<EcourtsCase> {
  const { data, error } = await supabase.functions.invoke<{ data: EcourtsCase }>('ecourts-case', { body: fresh ? { cnr, fresh } : { cnr } });
  if (error) return invokeError(error);
  if (!data?.data) throw new ApiError(404, 'NOT_FOUND', 'No case found for this CNR on eCourts.');
  return { ...data.data, orders: data.data.orders ?? [], hearings: data.data.hearings ?? [] };
}

async function action<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<{ data: T }>('ecourts', { body });
  if (error) return invokeError(error);
  return data!.data;
}

// ---- court directory ----

export type DirectoryCourt = {
  /** Directory id ('HC:GJ', 'TR:DRT:AHMEDABAD-I'), or 'MY:<courts.id>' for a court the advocate added. */
  id: string;
  /** OTHER: a court the advocate added themself. */
  level: 'SC' | 'HC' | 'TRIBUNAL' | 'DC' | 'OTHER';
  name: string;
  shortName?: string;
  bench?: string;
  stateCodes: string[];
  stateName?: string;
  districtCode?: string;
  districtName?: string;
  /** eCourtsIndia court codes (tribunal benches it covers). */
  courtCodes: string[];
};

type DirectoryRow = {
  id: string;
  level: string;
  name: string;
  short_name: string | null;
  bench: string | null;
  state_codes: string[];
  state_name: string | null;
  district_code: string | null;
  district_name: string | null;
  court_codes: string[] | null;
};

const toDirectoryCourt = (r: DirectoryRow): DirectoryCourt => ({
  id: r.id,
  level: r.level as DirectoryCourt['level'],
  name: r.name,
  shortName: r.short_name ?? undefined,
  bench: r.bench ?? undefined,
  stateCodes: r.state_codes ?? [],
  stateName: r.state_name ?? undefined,
  districtCode: r.district_code ?? undefined,
  districtName: r.district_name ?? undefined,
  courtCodes: r.court_codes ?? [],
});

const OWN_PREFIX = 'MY:';
export const isOwnCourt = (c: Pick<DirectoryCourt, 'id'>) => c.id.startsWith(OWN_PREFIX);
export const ownCourtId = (c: Pick<DirectoryCourt, 'id'>) => c.id.slice(OWN_PREFIX.length);

/** A court from the advocate's own list (added by name, not from the directory), in picker form. */
export const ownCourtEntry = (c: Court): DirectoryCourt => ({
  id: `${OWN_PREFIX}${c.id}`,
  level: 'OTHER',
  name: c.name,
  stateCodes: [],
  districtName: c.city || undefined,
  courtCodes: [],
});

/** "Debts Recovery Tribunal, Ahmedabad" -> "drta": initials, for short-form matches on own courts. */
const initials = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !['and', 'of', 'the', 'at', 'for', 'in'].includes(w))
    .map((w) => w[0])
    .join('');

/** Own courts matching the search the way the directory does: every word, or the initials. */
export function matchOwnCourts(courts: Court[], q: string): DirectoryCourt[] {
  const words = q.toLowerCase().replace(/[^a-z0-9& ]/g, ' ').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return courts
    .filter((c) => !c.directoryId)
    .filter((c) => {
      const text = `${c.name} ${c.city}`.toLowerCase();
      const ini = initials(c.name);
      return words.every((w) => text.includes(w) || ini.startsWith(w));
    })
    .map(ownCourtEntry);
}

/** Every court in India by name or short form ("GHC", "ccc ahd", "district court pune"). */
export async function searchCourtDirectory(q: string, limit = 40): Promise<DirectoryCourt[]> {
  if (!q.trim()) return [];
  const rows = await unwrap(supabase.rpc('search_courts', { p_q: q, p_limit: limit }));
  return (rows as DirectoryRow[]).map(toDirectoryCourt);
}

const DIRECTORY_COLUMNS = 'id, level, name, short_name, bench, state_codes, state_name, district_code, district_name, court_codes';

/**
 * The whole court list, a page at a time: Supreme Court, High Courts, tribunals, then district
 * courts, each by state and name (sort_rank).
 */
export async function listCourtDirectoryPage(offset: number, limit = 60): Promise<DirectoryCourt[]> {
  const rows = await unwrap(
    supabase
      .from('court_directory')
      .select(DIRECTORY_COLUMNS)
      .order('sort_rank')
      .order('state_name', { ascending: true, nullsFirst: true })
      .order('name')
      .range(offset, offset + limit - 1),
  );
  return (rows as DirectoryRow[]).map(toDirectoryCourt);
}

export async function getDirectoryCourts(ids: string[]): Promise<DirectoryCourt[]> {
  if (!ids.length) return [];
  const rows = await unwrap(supabase.from('court_directory').select(DIRECTORY_COLUMNS).in('id', ids));
  return (rows as DirectoryRow[]).map(toDirectoryCourt);
}

/** When the directory was last asked to sync, and whether states were still left to load then. */
let lastSync = { at: 0, pending: true };
/** One sync call works for about two minutes; the next call picks up the remaining states. */
const SYNC_GAP_MS = 150_000;

/**
 * The district courts of the directory come from the eCourts court structure. Asked when the court
 * list opens: the function only reads states that are missing or a month old, in the background.
 * Once every state is in, it is not asked again this app session.
 */
export function syncCourtDirectory() {
  if (!lastSync.pending || Date.now() - lastSync.at < SYNC_GAP_MS) return;
  lastSync = { at: Date.now(), pending: true };
  action<{ pending: number }>({ action: 'syncCourts' })
    .then((r) => (lastSync = { at: Date.now(), pending: (r?.pending ?? 0) > 0 }))
    .catch(() => (lastSync = { at: 0, pending: true }));
}

// ---- case search ----

/** How a case can be found on eCourts. Which ones a court offers depends on its level. */
export type SearchMode = 'cnr' | 'number' | 'filing' | 'fir' | 'party' | 'advocate';

export const SEARCH_MODES: Record<SearchMode, { label: string; title: string; hint: string }> = {
  cnr: { label: 'CNR', title: 'CNR number', hint: '16-character CNR number' },
  number: { label: 'Case no.', title: 'Case number', hint: 'Case type, number and year' },
  filing: { label: 'Filing no.', title: 'Filing number', hint: 'Filing number and year' },
  fir: { label: 'FIR no.', title: 'FIR number', hint: 'FIR number, year and police station' },
  party: { label: 'Party', title: 'Party name', hint: 'Petitioner or respondent name' },
  advocate: { label: 'Advocate', title: 'Advocate name', hint: 'Cases of an advocate' },
};

/**
 * How a court's cases can be found, as eCourts offers it:
 * - District courts (eCourts district portal): CNR, case no., filing no., FIR no., party, advocate.
 * - High Courts (eCourts HC portal): CNR, case no., filing no., party, advocate.
 * - Supreme Court: CNR, case no., party, advocate.
 * - Tribunals eCourtsIndia holds (DRT, CAT, NCLT, consumer commissions...): case no., party,
 *   advocate. They have no CNR, filing or FIR numbers.
 * Empty: the court isn't on eCourts (other tribunals, courts the advocate added); its cases are
 * entered by hand.
 */
export function modesFor(court?: Pick<DirectoryCourt, 'level' | 'shortName'> | null): SearchMode[] {
  if (court?.level === 'DC') return ['cnr', 'number', 'filing', 'fir', 'party', 'advocate'];
  if (court?.level === 'HC') return ['cnr', 'number', 'filing', 'party', 'advocate'];
  if (court?.level === 'SC') return ['cnr', 'number', 'party', 'advocate'];
  if (court?.level === 'TRIBUNAL' && tribunalOnEcourts(court.shortName)) return ['number', 'party', 'advocate'];
  return [];
}

export type CaseSearchInput = {
  mode: Exclude<SearchMode, 'cnr'>;
  court: DirectoryCourt;
  number?: string;
  year?: number;
  caseTypeCode?: string;
  policeStation?: string;
  name?: string;
  side?: 'any' | 'petitioner' | 'respondent';
  status?: 'any' | 'pending' | 'disposed';
  page?: number;
  /** Later pages of a search that was widened beyond the court's district / state. */
  wide?: boolean;
  /** A tribunal's own case type codes: keeps the search to that tribunal's cases. */
  scopeTypes?: string[];
};

export type CaseSearchResult = {
  cnr: string;
  caseNumber?: string;
  filingNumber?: string;
  caseTypeCode?: string;
  caseType?: string;
  status?: string;
  disposed: boolean;
  courtName?: string;
  filingDate?: ISODate;
  nextHearingDate?: ISODate;
  lastHearingDate?: ISODate;
  decisionDate?: ISODate;
  petitioners: string[];
  respondents: string[];
  advocates: string[];
  judges: string[];
};

export type CaseSearchPage = { results: CaseSearchResult[]; total: number; page: number; hasNextPage: boolean; widened?: boolean };

/** Finds cases on eCourts in the chosen court (metered: one credit per page). */
export function searchCases(input: CaseSearchInput): Promise<CaseSearchPage> {
  const { court } = input;
  return action<CaseSearchPage>({
    action: 'search',
    scope: {
      level: court.level,
      states: court.stateCodes,
      district: court.level === 'DC' ? court.districtCode : undefined,
      courtCodes: court.courtCodes.length ? court.courtCodes : undefined,
      caseTypes: input.scopeTypes?.length ? input.scopeTypes : undefined,
    },
    by: input.mode === 'filing' ? 'number' : input.mode,
    number: input.number,
    year: input.year,
    caseType: input.mode === 'number' ? input.caseTypeCode : undefined,
    policeStation: input.policeStation,
    name: input.name,
    side: input.side,
    status: input.status,
    page: input.page,
    wide: input.wide,
  });
}

export type EcourtsCaseType = { code: string; name: string };

/**
 * Every eCourts case type (code + name), A to Z. Read from the shared ecourts_case_types table;
 * only when that is still empty does the ecourts function fetch them from eCourtsIndia (and fill it).
 */
export async function listEcourtsCaseTypes(): Promise<EcourtsCaseType[]> {
  const rows = await unwrap(supabase.from('ecourts_case_types').select('code, name').order('name'));
  if (rows.length) return rows;
  return action<EcourtsCaseType[]>({ action: 'caseTypes' });
}

/** React Query options for the case type list: cached for the session, retried with a pause (429s). */
export const ecourtsCaseTypesQuery = {
  queryKey: ['ecourts-case-types'],
  queryFn: listEcourtsCaseTypes,
  staleTime: Infinity,
  retry: 4,
  retryDelay: (n: number) => 2000 * (n + 1),
} as const;

// ---- orders ----

const ORDER_POLL_MS = 5_000;
const ORDER_GIVE_UP_MS = 150_000;

/**
 * A short-lived link to an order's PDF, opened in the browser. When eCourts has to read the order
 * live from the court (a minute or more), the function answers "pending" and keeps fetching; this
 * asks again every 15 s until the PDF is there. `onWaiting` fires once, to tell the user.
 */
export async function orderLink(orderId: string, onWaiting?: () => void, shouldStop?: () => boolean): Promise<string> {
  const started = Date.now();
  let told = false;
  for (;;) {
    if (shouldStop?.()) throw new ApiError(0, 'CANCELLED', 'Cancelled.');
    const r = await action<{ url?: string; pending?: boolean }>({ action: 'orderLink', orderId });
    if (r.url) return r.url;
    if (!r.pending) throw new ApiError(502, 'ORDER_UNAVAILABLE', "Couldn't get this order from eCourts.");
    if (Date.now() - started > ORDER_GIVE_UP_MS)
      throw new ApiError(503, 'COURT_UNAVAILABLE', 'The court is taking long to send this order to eCourts. Try again in a few minutes.');
    if (!told) {
      told = true;
      onWaiting?.();
    }
    await new Promise((res) => setTimeout(res, ORDER_POLL_MS));
  }
}

/**
 * Updates saved cases from the court (dates, what happened, orders, disposal). With `caseIds` it
 * updates those cases and answers when done (a case being opened, or Refresh with `force`);
 * without, it queues the advocate's cases due an update (app start) and answers at once.
 */
export function syncCases(opts: { caseIds?: string[]; force?: boolean } = {}) {
  return action<{ updated?: number; queued?: number; refreshing?: boolean }>({ action: 'syncCases', ...opts });
}

const warmed = new Set<string>();
/**
 * Starts fetching a case's newest orders in the background (once per case per app session), so a
 * tap opens them at once. Costs an eCourts credit per order, the first time only.
 */
export function warmCaseOrders(caseId: string) {
  if (warmed.has(caseId)) return;
  warmed.add(caseId);
  action({ action: 'warmOrders', caseId }).catch(() => warmed.delete(caseId));
}

/** The public eCourts case-status page, for orders eCourtsIndia can't fetch right now. */
export const ECOURTS_CASE_STATUS_URL = 'https://services.ecourts.gov.in/ecourtindia_v6/';
