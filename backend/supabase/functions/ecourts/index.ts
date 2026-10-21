// ecourts: everything Add case and the case screen need from eCourtsIndia, except a single case
// by CNR (that is ecourts-case).
//
// POST { "action": "states" }                                         court list: states / UTs (free)
// POST { "action": "districts", "state": "GJ" }                       districts of a state (free)
// POST { "action": "complexes", "state": "GJ", "district": "1" }      court complexes of a district (free)
// POST { "action": "caseTypes" }                                      every eCourts case type code (free)
// POST { "action": "search", ... }                                    find cases (metered, see SearchInput)
// POST { "action": "allDistricts" }                                   every district of every state (free)
// POST { "action": "syncCourts" }                                     fill court_directory with every
//                                                                     district court complex (free, background)
// POST { "action": "orderLink", "orderId": "<case_orders.id>" }       { url }: a short-lived link to the order
//                                                                     PDF, opened in the browser (metered, once);
//                                                                     { pending: true } while eCourts still reads it
//                                                                     from the court (ask again shortly)
// POST { "action": "syncCases" [, "caseIds": [...], "force": true] }   update saved cases from the court:
//                                                                     dates, outcomes, orders (see syncCases)
// POST { "action": "warmOrders", "caseId": "<cases.id>" }             fetch a case's newest orders in the
//                                                                     background, so they open at once
// POST { "action": "order", "orderId": "<case_orders.id>" }           court order PDF -> case documents (metered, once)
// POST { "action": "prefetch", "caseId": "<cases.id>" }               save a case's due orders in the background
// POST { "action": "syncOrders" }  + x-cron-secret header              the pg_cron job: due orders of every advocate
//                                                                     (job paused 21 Oct 2026: orders open on tap)
//
// The eCourtsIndia API key is the ECOURTS_API_KEY secret and never leaves this function. Every
// action but syncOrders needs a signed-in user and works through that user's session, so row level
// security decides which case and storage folder it may touch. syncOrders proves itself with the
// ECOURTS_CRON_SECRET (also in Vault for the cron job) and uses the service key; so does syncCourts,
// which writes the shared, read-only court_directory.
//
// Court orders: eCourtsIndia sends a PDF at once when it holds it, and otherwise fetches it live from
// the court's eCourts site, which works for some courts and not others at a given time (20 Oct 2026:
// Delhi High Court fine; district courts in Punjab and Maharashtra failing). Each order records its
// tries (case_orders.tries / last_tried_at / last_error).

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import * as ec from '../_shared/ecourtsCase.ts';

const API_BASE = 'https://webapi.ecourtsindia.com';
const BUCKET = 'case-docs';
const MAX_PDF_BYTES = 20 * 1024 * 1024; // documents.size_bytes limit

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Json = Record<string, unknown>;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
const fail = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } });

class Failure extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const str = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? String(v)
    : typeof v === 'string' && v.trim()
      ? v.trim()
      : undefined;
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => !!x) : []);
const day = (v: unknown) => /^(\d{4}-\d{2}-\d{2})/.exec(str(v) ?? '')?.[1];

// ---------------------------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------------------------

function apiKey() {
  // Tolerate common paste mistakes: spaces / newlines, quotes, "Bearer " or "ECOURTS_API_KEY=" in front.
  const key = Deno.env
    .get('ECOURTS_API_KEY')
    ?.replace(/\s+/g, '')
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^(ECOURTS_API_KEY=|Bearer)/i, '')
    .replace(/^['"]+|['"]+$/g, '');
  if (!key) throw new Failure(503, 'NOT_CONFIGURED', 'eCourts lookup is not set up yet.');
  return key;
}

function publishableKey() {
  try {
    const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<
      string,
      string
    >;
    if (keys.default) return keys.default;
  } catch {
    /* fall through */
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? '';
}

/** A Supabase client acting as the caller, or null when the request has no valid signed-in session. */
async function callerClient(req: Request): Promise<{ db: SupabaseClient; userId: string } | null> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', publishableKey(), {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(auth.slice(7));
  if (error || !data.user || data.user.is_anonymous) return null;
  return { db, userId: data.user.id };
}

/** GET/POST to eCourtsIndia with the partner key; turns its errors into messages the app can show. */
async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = {
    Authorization: `Bearer ${apiKey()}`,
    Accept: 'application/json',
    ...(init.headers ?? {}),
  };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Failure(502, 'UPSTREAM_UNREACHABLE', "Couldn't reach eCourts. Please try again.");
  }
  if (res.ok) return res;
  const text = await res.text().catch(() => '');
  let reason = text.slice(0, 160);
  try {
    const b = JSON.parse(text) as Json;
    const e = (b.error ?? b) as Json;
    reason = str(e.message) ?? str(b.message) ?? str(e.code) ?? reason;
  } catch {
    /* not JSON */
  }
  if (res.status === 401)
    throw new Failure(502, 'UPSTREAM_AUTH', `eCourtsIndia rejected the API key (401): ${reason}`);
  if (res.status === 402)
    throw new Failure(502, 'UPSTREAM_CREDITS', 'The eCourts API account is out of credits.');
  if (res.status === 404) throw new Failure(404, 'NOT_FOUND', reason || 'Not found on eCourts.');
  if (res.status === 429)
    throw new Failure(429, 'RATE_LIMITED', 'Too many eCourts requests. Try again in a minute.');
  throw new Failure(502, 'UPSTREAM_ERROR', `eCourts request failed (${res.status}): ${reason}`);
}

const body = async (res: Response) => ((await res.json().catch(() => null)) ?? {}) as Json;
/** Court-structure answers are bare arrays in some versions and { data: [...] } in others. */
const list = (b: unknown) =>
  Array.isArray(b)
    ? (b as Json[])
    : Array.isArray((b as Json)?.data)
      ? ((b as Json).data as Json[])
      : [];

/** The admin client (service key) of the sync jobs: shared tables and every advocate's orders. */
function adminClient(): SupabaseClient {
  let key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  try {
    key =
      (JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}') as Record<string, string>)
        .default ?? key;
  } catch {
    /* keep the legacy key */
  }
  if (!key) throw new Failure(503, 'NOT_CONFIGURED', 'The sync job has no service key.');
  return createClient(Deno.env.get('SUPABASE_URL') ?? '', key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Runs after the response is sent (the Edge Function keeps going until it finishes). */
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined;
const background = async (work: Promise<unknown>) => {
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work);
  else await work;
};

// ---------------------------------------------------------------------------------------------
// Court list and case types (free). Cached per function instance: they change a few times a year.
// ---------------------------------------------------------------------------------------------

const cache = new Map<string, { at: number; value: unknown }>();
const DAY_MS = 24 * 60 * 60 * 1000;

async function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < DAY_MS) return hit.value as T;
  const value = await load();
  cache.set(key, { at: Date.now(), value });
  return value;
}

const CODE = /^[A-Za-z0-9-]{1,16}$/;
const STRUCTURE = '/api/partner/causelist/court-structure/states';

const states = () =>
  cached('states', async () =>
    list(await body(await api(STRUCTURE)))
      .map((s) => ({ code: str(s.state) ?? '', name: str(s.stateName) ?? '' }))
      .filter((s) => s.code && s.name),
  );

const districts = (state: string) =>
  cached(`districts:${state}`, async () =>
    list(await body(await api(`${STRUCTURE}/${state}/districts`)))
      .map((d) => ({ code: str(d.districtCode) ?? '', name: str(d.districtName) ?? '' }))
      .filter((d) => d.code && d.name),
  );

/** Every district of every state in one answer (free), so the court search can find "Pune" anywhere. */
const allDistricts = () =>
  cached('allDistricts', async () => {
    const sts = (await states()).filter((s) => s.code !== 'SC');
    const out: { state: string; stateName: string; code: string; name: string }[] = [];
    for (let i = 0; i < sts.length; i += 6) {
      const batch = await Promise.all(
        sts.slice(i, i + 6).map((s) => districts(s.code).catch(() => [])),
      );
      batch.forEach((list, j) => {
        const s = sts[i + j]!;
        for (const d of list)
          if (d.code !== 'HC')
            out.push({ state: s.code, stateName: s.name, code: d.code, name: d.name });
      });
    }
    return out;
  });

const complexes = (state: string, district: string) =>
  cached(`complexes:${state}:${district}`, async () =>
    list(await body(await api(`${STRUCTURE}/${state}/districts/${district}/complexes`)))
      .map((c) => ({ code: str(c.courtComplexCode) ?? '', name: str(c.courtComplexName) ?? '' }))
      .filter((c) => c.code && c.name),
  );

type CaseType = { code: string; name: string };

/**
 * The enum answer, whatever its shape: [{ code, description }], [{ value, label }], ["WP_C"] or
 * { WP_C: "Writ Petition (Civil)" }, under data.caseType or data.enums.caseType.
 */
function parseCaseTypes(b: Json): CaseType[] {
  const data = (b.data ?? b) as Json;
  const raw = data.caseType ?? (data.enums as Json | undefined)?.caseType ?? data.caseTypes;
  const items: CaseType[] = Array.isArray(raw)
    ? raw.map((t) =>
        typeof t === 'string'
          ? { code: t, name: t }
          : {
              code: str((t as Json).code) ?? str((t as Json).value) ?? str((t as Json).key) ?? '',
              name: str((t as Json).description) ?? str((t as Json).label) ?? str((t as Json).name) ?? str((t as Json).code) ?? '',
            },
      )
    : raw && typeof raw === 'object'
      ? Object.entries(raw as Json).map(([code, name]) => ({ code, name: str(name) ?? code }))
      : [];
  const seen = new Set<string>();
  return items.filter((t) => t.code && t.name && t.code !== 'UNKNOWN' && !seen.has(t.code) && !!seen.add(t.code));
}

const CASE_TYPES_STALE_MS = 30 * DAY_MS;

/**
 * Every eCourts case type. Kept in ecourts_case_types (the app reads that table directly); read
 * from eCourtsIndia only when the table is empty or a month old. One retry after a 429.
 */
async function caseTypes(): Promise<CaseType[]> {
  const db = adminClient();
  const { data } = await db.from('ecourts_case_types').select('code, name, updated_at').order('name');
  const rows = (data ?? []) as (CaseType & { updated_at: string })[];
  const fresh = rows.length > 0 && Date.now() - Date.parse(rows[0]!.updated_at) < CASE_TYPES_STALE_MS;
  if (fresh) return rows.map(({ code, name }) => ({ code, name }));

  let list: CaseType[] = [];
  try {
    list = parseCaseTypes(await body(await api('/api/partner/enums?types=caseType')));
  } catch (e) {
    if (codeOf(e) !== 'RATE_LIMITED') {
      if (rows.length) return rows.map(({ code, name }) => ({ code, name }));
      throw e;
    }
    await pause(3000);
    list = parseCaseTypes(await body(await api('/api/partner/enums?types=caseType')));
  }
  if (!list.length) {
    if (rows.length) return rows.map(({ code, name }) => ({ code, name }));
    throw new Failure(502, 'NO_CASE_TYPES', 'eCourts sent no case types. Try again in a minute.');
  }
  const now = new Date().toISOString();
  for (let i = 0; i < list.length; i += 500)
    await db.from('ecourts_case_types').upsert(list.slice(i, i + 500).map((t) => ({ ...t, updated_at: now })));
  return [...list].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------------------------
// court_directory sync (free): every district court complex of every state, a state at a time.
// ---------------------------------------------------------------------------------------------

/** A state's complexes are read again after this long. */
const COURTS_STALE_MS = 30 * DAY_MS;
/** Only one sync runs per function instance at a time. */
let syncingCourts: Promise<unknown> | null = null;

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z]/g, '');

const titleCase = (s: string) =>
  s.toLowerCase().replace(/(^|[\s,(/-])([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase());

/**
 * Pause between court-structure calls: eCourtsIndia rate-limits bursts (429), even of free calls,
 * and the limit is shared with the user's own searches. Slow and steady leaves them room.
 */
const STRUCTURE_PAUSE_MS = 1500;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Reads every district court complex of one state and saves them. Any failure (a 429 above all)
 * fails the whole state, so a half-read state is never saved as done; it is read again next time.
 */
async function syncCourtState(db: SupabaseClient, state: { code: string; name: string }) {
  const rows: Json[] = [];
  const list = await districts(state.code);
  for (const d of list) {
    if (d.code === 'HC') continue; // the High Court is seeded with its benches
    await pause(STRUCTURE_PAUSE_MS);
    for (const c of await complexes(state.code, d.code)) {
      rows.push({
        id: `DC:${state.code}:${d.code}:${c.code}`,
        level: 'DC',
        name: titleCase(c.name),
        state_codes: [state.code],
        state_name: titleCase(state.name),
        district_code: d.code,
        district_name: titleCase(d.name),
        complex_code: c.code,
        updated_at: new Date().toISOString(),
      });
    }
  }
  // eCourts sometimes lists a complex twice; one upsert can't touch the same row twice.
  const unique = [...new Map(rows.map((r) => [r.id as string, r])).values()];
  for (let i = 0; i < unique.length; i += 500) {
    const { error } = await db.from('court_directory').upsert(unique.slice(i, i + 500));
    if (error) throw new Failure(500, 'DB_ERROR', "Couldn't save the court list.");
  }
  return rows.length;
}

/**
 * Brings the directory up to date: High Courts get the state codes eCourts uses (matched by state
 * name), then each state whose district courts are missing or older than 30 days is read again.
 * Runs in the background within about two minutes; the next call picks up where it stopped.
 */
async function syncCourts() {
  const db = adminClient();
  const sts = (await states()).filter((s) => s.code !== 'SC' && CODE.test(s.code));
  const { data, error } = await db
    .from('court_directory')
    .select('id, level, state_codes, state_name, updated_at')
    .in('level', ['HC', 'DC']);
  if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read the court list.");
  const rows = (data ?? []) as {
    id: string;
    level: string;
    state_codes: string[];
    state_name: string | null;
    updated_at: string;
  }[];

  // State codes for the High Courts, from the names of the states each one serves.
  const codeByName = new Map(sts.map((s) => [normName(s.name), s.code]));
  const hcFixes = rows
    .filter((r) => r.level === 'HC' && r.state_name)
    .flatMap((r) => {
      const codes = r.state_name!.split(',').map((n) => codeByName.get(normName(n)));
      if (codes.some((c) => !c)) return [];
      const next = codes as string[];
      return next.join() === r.state_codes.join() ? [] : [{ id: r.id, state_codes: next }];
    });

  const synced = new Map<string, number>();
  for (const r of rows)
    if (r.level === 'DC')
      for (const s of r.state_codes)
        synced.set(s, Math.max(synced.get(s) ?? 0, Date.parse(r.updated_at)));
  const now = Date.now();
  const due = sts.filter((s) => now - (synced.get(s.code) ?? 0) > COURTS_STALE_MS);

  if (!syncingCourts && (due.length || hcFixes.length)) {
    const deadline = now + 120_000;
    syncingCourts = (async () => {
      for (const f of hcFixes)
        await db.from('court_directory').update({ state_codes: f.state_codes }).eq('id', f.id);
      for (const s of due) {
        if (Date.now() > deadline) break;
        try {
          await syncCourtState(db, s);
        } catch (e) {
          console.error('syncCourts', s.code, codeOf(e));
          // Rate limited: stop now, so the user's own searches aren't blocked; the next call goes on.
          if (FATAL.includes(codeOf(e))) break;
        }
        await pause(STRUCTURE_PAUSE_MS);
      }
    })().finally(() => (syncingCourts = null));
    await background(syncingCourts);
  }
  return { states: sts.length, pending: due.length };
}

// ---------------------------------------------------------------------------------------------
// Case search (metered: one call per page)
// ---------------------------------------------------------------------------------------------

type SearchInput = {
  /** Where to look: court level, plus states / a district / tribunal bench codes. */
  scope?: { level?: string; states?: string[]; district?: string; courtCodes?: string[]; caseTypes?: string[] };
  /** number: case or filing number (+ year). fir: FIR number (+ year). party / advocate: a name. */
  by: 'number' | 'fir' | 'party' | 'advocate';
  number?: string;
  year?: number;
  caseType?: string;
  /** FIR search: the police station, narrowing the full-text match. */
  policeStation?: string;
  name?: string;
  side?: 'any' | 'petitioner' | 'respondent';
  fuzzy?: boolean;
  status?: 'pending' | 'disposed' | 'any';
  page?: number;
  /** Search wide from the start (later pages of a widened search). */
  wide?: boolean;
};

const FIELDS = [
  'cnr',
  'registrationNumber',
  'filingNumber',
  'caseType',
  'caseStatus',
  'courtCode',
  'courtName',
  'stateCode',
  'filingDate',
  'registrationDate',
  'nextHearingDate',
  'lastHearingDate',
  'decisionDate',
  'petitioners',
  'respondents',
  'petitionerAdvocates',
  'respondentAdvocates',
  'judges',
];

/** narrow: the court's own place (district; for tribunals, the state). wide: dropped. */
function searchQuery(input: SearchInput, narrow: boolean) {
  const q = new URLSearchParams();
  const scope = input.scope ?? {};
  const level = str(scope.level)?.toUpperCase();
  if (level && ['SC', 'HC', 'DC', 'TRIBUNAL'].includes(level)) q.append('courtLevels', level);
  if (narrow || level !== 'TRIBUNAL')
    for (const s of strs(scope.states)) if (/^[A-Z]{2}$/.test(s)) q.append('stateCodes', s);
  const district = str(scope.district);
  if (narrow && district && CODE.test(district)) q.append('districtCodes', district);
  for (const c of strs(scope.courtCodes)) if (/^[A-Z0-9]{3,12}$/.test(c)) q.append('courtCodes', c);
  // A tribunal's own case types keep the search to its cases (unless one type was picked).
  const scopeTypes = strs(scope.caseTypes).filter((t) => /^[A-Za-z0-9_]{1,30}$/.test(t)).slice(0, 80);
  if (!(input.by === 'number' && str(input.caseType))) for (const t of scopeTypes) q.append('caseTypes', t);

  const year = Number(input.year);
  const hasYear = Number.isInteger(year) && year >= 1900 && year <= 2100;
  if (input.by === 'number' || input.by === 'fir') {
    const n = str(input.number)?.replace(/\s+/g, '');
    if (!n || !/^[A-Za-z0-9./-]{1,30}$/.test(n))
      throw new Failure(422, 'INVALID_NUMBER', 'Enter the number using letters, digits, / or -.');
    if (!hasYear) throw new Failure(422, 'INVALID_YEAR', 'Enter the year.');
    const bare = n.replace(/\/\d{4}$/, '');
    if (input.by === 'number') {
      // caseNumbers is normalised to N/YYYY and matched against the registration OR filing number.
      q.append('caseNumbers', `${bare}/${year}`);
      const type = str(input.caseType);
      if (type && /^[A-Za-z0-9_]{1,20}$/.test(type)) q.append('caseTypes', type);
    } else {
      // No FIR filter in the partner search: a full-text match on the FIR details of the case.
      const station = str(input.policeStation)?.replace(/[^A-Za-z .-]/g, '').slice(0, 60);
      q.set('query', [`${bare}/${year}`, station].filter(Boolean).join(' '));
    }
    q.set('sortBy', 'score');
  } else if (input.by === 'party' || input.by === 'advocate') {
    const name = str(input.name)?.replace(/\s+/g, ' ');
    if (!name || name.length < 3 || name.length > 80)
      throw new Failure(422, 'INVALID_NAME', 'Enter at least 3 letters of the name.');
    const field =
      input.by === 'advocate'
        ? 'advocates'
        : input.side === 'petitioner'
          ? 'petitioners'
          : input.side === 'respondent'
            ? 'respondents'
            : 'litigants';
    q.append(field, name);
    q.set('nameMatchMode', input.fuzzy ? 'fuzzy' : 'all');
    if (hasYear) q.append('filingYears', String(year));
    q.set('sortBy', 'filingDate desc');
  } else {
    throw new Failure(422, 'BAD_REQUEST', 'Unknown search type.');
  }
  if (
    !q.has('courtLevels') &&
    !q.has('stateCodes') &&
    !q.has('courtCodes') &&
    input.by !== 'number'
  ) {
    throw new Failure(422, 'NO_COURT', 'Pick a court first.');
  }

  // Pending cases have no decision date yet; disposed ones do (works for every disposal status).
  if (input.status === 'pending') q.append('missingFields', 'decisionDate');
  if (input.status === 'disposed') q.append('existsFields', 'decisionDate');

  const page = Math.min(Math.max(Math.trunc(Number(input.page) || 1), 1), 50);
  q.set('page', String(page));
  q.set('pageSize', '50');
  q.set('includeFacetCounts', 'false');
  for (const f of FIELDS) q.append('fields', f);
  return { q, page };
}

async function runSearch(q: URLSearchParams, page: number) {
  const data = ((await body(await api(`/api/partner/search?${q}`))).data ?? {}) as Json;
  const lookup = (((data.enumDescriptions ?? {}) as Json).enumLookup ?? {}) as Record<
    string,
    Record<string, string> | undefined
  >;
  const results = (Array.isArray(data.results) ? (data.results as Json[]) : []).flatMap((r) => {
    const cnr = str(r.cnr)?.toUpperCase();
    if (!cnr || !/^[A-Z0-9]{16}$/.test(cnr)) return [];
    const code = str(r.caseType);
    const status = str(r.caseStatus);
    return [
      {
        cnr,
        caseNumber: str(r.registrationNumber) ?? str(r.filingNumber),
        filingNumber: str(r.filingNumber),
        caseTypeCode: code,
        caseType: (code ? str(lookup.caseType?.[code]) : undefined) ?? code,
        status: (status ? str(lookup.caseStatus?.[status]) : undefined) ?? status,
        disposed: !!day(r.decisionDate),
        courtCode: str(r.courtCode),
        courtName:
          str(r.courtName) ??
          (str(r.courtCode) ? str(lookup.courtCode?.[str(r.courtCode)!]) : undefined),
        filingDate: day(r.filingDate) ?? day(r.registrationDate),
        nextHearingDate: day(r.nextHearingDate),
        lastHearingDate: day(r.lastHearingDate),
        decisionDate: day(r.decisionDate),
        petitioners: strs(r.petitioners),
        respondents: strs(r.respondents),
        advocates: [...strs(r.petitionerAdvocates), ...strs(r.respondentAdvocates)],
        judges: strs(r.judges),
      },
    ];
  });
  return {
    results,
    total: Number(data.totalHits) || results.length,
    page,
    hasNextPage: data.hasNextPage === true,
  };
}

async function search(input: SearchInput) {
  // "Show more" after a widened search stays wide.
  if (input.wide) {
    const wide = searchQuery(input, false);
    return { ...(await runSearch(wide.q, wide.page)), widened: true };
  }
  const first = searchQuery(input, true);
  const found = await runSearch(first.q, first.page);
  // The court-structure district code isn't always the one the search index uses, and a tribunal's
  // cases may not carry its state: when the narrow search finds nothing, look wider once (the
  // results name their court).
  const tribunal = str(input.scope?.level)?.toUpperCase() === 'TRIBUNAL';
  if (found.results.length === 0 && first.page === 1 && (first.q.has('districtCodes') || (tribunal && first.q.has('stateCodes')))) {
    const wide = searchQuery(input, false);
    return { ...(await runSearch(wide.q, wide.page)), widened: true };
  }
  return { ...found, widened: false };
}

// ---------------------------------------------------------------------------------------------
// Court order PDF (metered: paid once, then kept in the advocate's storage folder)
// ---------------------------------------------------------------------------------------------

const isPdf = (b: Uint8Array) =>
  b.length > 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF
const fromBase64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/^data:[^,]+,/, '')), (c) => c.charCodeAt(0));

/** Pulls PDF bytes out of whatever the order endpoints answer: raw PDF, { pdfBase64 } or a download link. */
async function pdfFrom(res: Response): Promise<Uint8Array | null> {
  if (!(res.headers.get('content-type') ?? '').includes('json')) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    return isPdf(bytes) ? bytes : null;
  }
  const data = ((await body(res)).data ?? {}) as Json;
  if (typeof data.pdfBase64 === 'string') {
    const bytes = fromBase64(data.pdfBase64);
    if (isPdf(bytes)) return bytes;
  }
  const link = [data.downloadUrl, data.url, data.pdfUrl, data.signedUrl, data.fileUrl]
    .map(str)
    .find((u) => !!u && u.startsWith('https://'));
  if (link) {
    const sameHost = new URL(link).host === new URL(API_BASE).host;
    const f = await fetch(
      link,
      sameHost ? { headers: { Authorization: `Bearer ${apiKey()}` } } : {},
    ).catch(() => null);
    if (f?.ok) {
      const bytes = new Uint8Array(await f.arrayBuffer());
      if (isPdf(bytes)) return bytes;
    }
  }
  return null;
}

/**
 * The court order PDF, in one call. When eCourtsIndia already holds the order it answers with the
 * PDF in well under a second. When it doesn't, it fetches it live from the court's eCourts server,
 * and for some courts that fails at once ("service_unavailable: A service did not answer in time").
 * Measured on 20 Oct 2026: a stored Delhi order came back in 99 ms; every order of a Ferozepur case
 * failed this way on /order, /order?signed=false and /order-md alike, so a second route or a retry
 * only adds a failed call to the partner log. One call, then a clear COURT_UNAVAILABLE.
 */
async function orderPdf(cnr: string, file: string, timeoutMs = 20_000): Promise<Uint8Array> {
  try {
    const res = await api(`/api/partner/case/${cnr}/order/${encodeURIComponent(file)}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    const bytes = await pdfFrom(res);
    if (bytes) return bytes;
    throw new Failure(
      502,
      'ORDER_UNAVAILABLE',
      "Couldn't get this order from eCourts. eCourts answered without a PDF.",
    );
  } catch (e) {
    if (!(e instanceof Failure)) throw courtUnavailable(); // timed out
    if (
      e.code === 'ORDER_UNAVAILABLE' ||
      ['UPSTREAM_CREDITS', 'UPSTREAM_AUTH', 'NOT_CONFIGURED', 'RATE_LIMITED'].includes(e.code)
    )
      throw e;
    if (e.status >= 500 || /in time|temporar|unavailable|backoff|timeout/i.test(e.message))
      throw courtUnavailable();
    throw new Failure(
      502,
      'ORDER_UNAVAILABLE',
      `Couldn't get this order from eCourts. ${e.message}`,
    );
  }
}

const courtUnavailable = () =>
  new Failure(
    503,
    'COURT_UNAVAILABLE',
    "eCourts couldn't get this order from the court's website right now. Try again later, or open it on the eCourts website.",
  );

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const longDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
};

type OrderRow = {
  id: string;
  advocate_id: string;
  case_id: string;
  order_date: string;
  kind: string;
  file_name: string;
  document_id: string | null;
  tries: number;
  last_tried_at: string | null;
  last_error: string | null;
  case: { cnr_number: string | null } | null;
};
const ORDER_SELECT =
  'id, advocate_id, case_id, order_date, kind, file_name, document_id, tries, last_tried_at, last_error, case:cases!case_orders_case_fkey(cnr_number)';

/** Errors that stop all work for now: every other order would fail the same way. */
const FATAL = ['UPSTREAM_CREDITS', 'UPSTREAM_AUTH', 'RATE_LIMITED', 'NOT_CONFIGURED'];
const codeOf = (e: unknown) => (e instanceof Failure ? e.code : 'INTERNAL_ERROR');

/** Gap before an unsaved order is tried again: 30 min, 2 h, 6 h, then daily. */
const BACKOFF_MINUTES = [30, 120, 360, 1440];
const isDue = (r: OrderRow, now = Date.now()) =>
  !r.last_tried_at ||
  now - Date.parse(r.last_tried_at) >=
    (BACKOFF_MINUTES[Math.min(r.tries, BACKOFF_MINUTES.length) - 1] ?? 0) * 60_000;

const cnrOf = (row: OrderRow) => {
  const cnr = str(row.case?.cnr_number)?.toUpperCase();
  if (!cnr || !/^[A-Z0-9]{16}$/.test(cnr))
    throw new Failure(422, 'NO_CNR', 'This case has no CNR number.');
  return cnr;
};

/**
 * Downloads one order and keeps it as a document of the case's owner. Works with the caller's client
 * (row level security applies) and with the admin client of the sync job.
 */
async function saveOrder(db: SupabaseClient, row: OrderRow): Promise<string> {
  if (row.document_id) return row.document_id;
  const pdf = await orderPdf(cnrOf(row), row.file_name);
  if (pdf.byteLength > MAX_PDF_BYTES)
    throw new Failure(422, 'FILE_TOO_LARGE', 'This order is larger than 20 MB.');

  const path = `${row.advocate_id}/${row.case_id}/court-order-${row.file_name}`;
  const up = await db.storage
    .from(BUCKET)
    .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
  if (up.error)
    throw new Failure(500, 'UPLOAD_FAILED', "Couldn't save the order. Please try again.");

  // A previous attempt may have saved the document but not linked it.
  const existing = await db.from('documents').select('id').eq('storage_path', path).maybeSingle();
  let documentId = existing.data?.id as string | undefined;
  if (!documentId) {
    const label = row.kind === 'judgment' ? 'Judgment' : 'Court order';
    const ins = await db
      .from('documents')
      .insert({
        advocate_id: row.advocate_id,
        case_id: row.case_id,
        file_name: `${label} ${longDate(row.order_date)}.pdf`,
        category: 'order',
        mime_type: 'application/pdf',
        size_bytes: pdf.byteLength,
        storage_path: path,
      })
      .select('id')
      .single();
    if (ins.error || !ins.data)
      throw new Failure(500, 'DB_ERROR', "Couldn't save the order. Please try again.");
    documentId = ins.data.id as string;
  }
  await db
    .from('case_orders')
    .update({
      document_id: documentId,
      last_error: null,
      last_tried_at: new Date().toISOString(),
      tries: row.tries + 1,
    })
    .eq('id', row.id);
  return documentId;
}

/** Records a failed try, so the app can say why and the job knows when to try again. */
async function markTried(db: SupabaseClient, rows: OrderRow[], code: string) {
  const at = new Date().toISOString();
  await Promise.all(
    rows.map((r) =>
      db
        .from('case_orders')
        .update({ tries: r.tries + 1, last_tried_at: at, last_error: code })
        .eq('id', r.id),
    ),
  );
}

/**
 * Tries a case's unsaved orders, newest first. They all come from the same court, so when eCourts
 * can't reach the court for one, the rest are marked as tried too rather than failing one by one
 * (and filling the partner log). Returns false when all work must stop (no credits, bad key...).
 */
async function syncCaseOrders(db: SupabaseClient, rows: OrderRow[]): Promise<boolean> {
  const list = [...rows].sort((a, b) => b.order_date.localeCompare(a.order_date));
  for (const [i, r] of list.entries()) {
    try {
      await saveOrder(db, r);
    } catch (e) {
      const code = codeOf(e);
      if (FATAL.includes(code)) return false;
      if (code === 'COURT_UNAVAILABLE') {
        await markTried(db, list.slice(i), code);
        return true;
      }
      await markTried(db, [r], code);
    }
  }
  return true;
}

async function unsavedOrders(db: SupabaseClient, caseId: string): Promise<OrderRow[]> {
  const { data, error } = await db
    .from('case_orders')
    .select(ORDER_SELECT)
    .eq('case_id', caseId)
    .is('document_id', null);
  if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read this case's orders.");
  return (data ?? []) as unknown as OrderRow[];
}

async function orderRow(db: SupabaseClient, orderId: string): Promise<OrderRow> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Failure(422, 'BAD_REQUEST', 'Unknown order.');
  // Row level security: only the caller's own order (and so their own case) comes back.
  const { data, error } = await db
    .from('case_orders')
    .select(ORDER_SELECT)
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read this order.");
  if (!data) throw new Failure(404, 'NOT_FOUND', 'Order not found.');
  return data as unknown as OrderRow;
}

/** A tap on one order: try now (whatever the backoff says) and record the outcome. */
async function order(db: SupabaseClient, orderId: string) {
  const row = await orderRow(db, orderId);
  try {
    return { documentId: await saveOrder(db, row) };
  } catch (e) {
    const code = codeOf(e);
    if (!FATAL.includes(code)) {
      // Same court for the whole case: its other unsaved orders can't be fetched now either.
      const rows =
        code === 'COURT_UNAVAILABLE'
          ? await unsavedOrders(db, row.case_id).catch(() => [row])
          : [row];
      await markTried(db, rows, code).catch(() => undefined);
    }
    throw e;
  }
}

/** How long an order link stays valid. */
const LINK_SECONDS = 15 * 60;
/** How long eCourtsIndia may take to read an order live from the court (within the function's limit). */
const ORDER_FETCH_MS = 120_000;
/** How long the app's request waits before it is told "pending" (the fetch carries on). */
const ORDER_WAIT_MS = 25_000;
/** case_orders.last_error while a fetch is running. */
const FETCHING = 'FETCHING';

/** A fetch of this order is running (started less than the fetch limit ago). */
const isFetching = (row: OrderRow) =>
  row.last_error === FETCHING &&
  !!row.last_tried_at &&
  Date.now() - Date.parse(row.last_tried_at) < ORDER_FETCH_MS + 15_000;

/**
 * Marks the order as being fetched, then fetches its PDF from eCourts into `path` (the advocate's
 * folder). Resolves true when saved; records the error code on failure.
 */
async function startOrderFetch(db: SupabaseClient, row: OrderRow, path: string): Promise<{ job: Promise<boolean> }> {
  await db
    .from('case_orders')
    .update({ last_error: FETCHING, last_tried_at: new Date().toISOString(), tries: row.tries + 1 })
    .eq('id', row.id);
  const job = (async () => {
    try {
      const pdf = await orderPdf(cnrOf(row), row.file_name, ORDER_FETCH_MS);
      if (pdf.byteLength > MAX_PDF_BYTES)
        throw new Failure(422, 'FILE_TOO_LARGE', 'This order is larger than 20 MB.');
      const up = await db.storage
        .from(BUCKET)
        .upload(path, pdf, { contentType: 'application/pdf', upsert: true });
      if (up.error)
        throw new Failure(500, 'UPLOAD_FAILED', "Couldn't open the order. Please try again.");
      await db.from('case_orders').update({ last_error: null }).eq('id', row.id);
      return true;
    } catch (e) {
      await db
        .from('case_orders')
        .update({ last_error: codeOf(e), last_tried_at: new Date().toISOString() })
        .eq('id', row.id);
      throw e;
    }
  })();
  // Wrapped: awaiting a bare promise of a promise would wait for the whole fetch.
  return { job };
}

/** Orders warmed per case: the newest ones, the ones usually opened. */
const WARM_LATEST = 5;
/** An order whose fetch failed is not warmed again for this long (each try costs a credit). */
const WARM_RETRY_MS = 6 * 60 * 60 * 1000;

/**
 * Opening a case: fetch its newest orders into the advocate's folder in the background (two at a
 * time), so tapping one opens it at once. Orders already there, being fetched, or failed in the
 * last 6 hours are left alone. Nothing is added to Documents.
 */
async function warmOrders(db: SupabaseClient, caseId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Failure(422, 'BAD_REQUEST', 'Unknown case.');
  const { data, error } = await db
    .from('case_orders')
    .select(ORDER_SELECT)
    .eq('case_id', caseId)
    .is('document_id', null)
    .order('order_date', { ascending: false })
    .limit(WARM_LATEST);
  if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read this case's orders.");
  const rows = (data ?? []) as unknown as OrderRow[];
  if (!rows.length) return { queued: 0 };

  const folder = `${rows[0]!.advocate_id}/${caseId}/orders`;
  const { data: files } = await db.storage.from(BUCKET).list(folder, { limit: 1000 });
  const saved = new Set((files ?? []).map((f) => f.name));
  const now = Date.now();
  const due = rows.filter(
    (r) =>
      !saved.has(r.file_name) &&
      !isFetching(r) &&
      !(r.last_error && r.last_error !== FETCHING && r.last_tried_at && now - Date.parse(r.last_tried_at) < WARM_RETRY_MS),
  );
  if (!due.length) return { queued: 0 };

  const queue = [...due];
  let stop = false;
  const lane = async () => {
    for (let r = queue.shift(); r && !stop; r = queue.shift()) {
      try {
        await (await startOrderFetch(db, r, `${folder}/${r.file_name}`)).job;
      } catch (e) {
        if (FATAL.includes(codeOf(e))) stop = true; // no credits, bad key, rate limited
      }
    }
  };
  await background(Promise.all([lane(), lane()]));
  return { queued: due.length };
}

/**
 * "Open" on an order: a short-lived link to its PDF, for the browser. The PDF is fetched from
 * eCourts once and kept in the advocate's folder (not added to Documents), so opening it again
 * costs nothing. An order already saved to Documents opens from there.
 */
async function orderLink(db: SupabaseClient, orderId: string) {
  const row = await orderRow(db, orderId);
  let path = `${row.advocate_id}/${row.case_id}/orders/${row.file_name}`;
  if (row.document_id) {
    const doc = await db
      .from('documents')
      .select('storage_path')
      .eq('id', row.document_id)
      .maybeSingle();
    if (doc.data?.storage_path) path = doc.data.storage_path as string;
  }
  const signed = () => db.storage.from(BUCKET).createSignedUrl(path, LINK_SECONDS);
  const hit = await signed();
  if (hit.data?.signedUrl) return { url: hit.data.signedUrl };

  // A fetch started earlier (a tap, or the warm-up) is still running: don't pay for a second one.
  if (isFetching(row)) return { pending: true };

  // eCourtsIndia answers at once when it holds the order; otherwise it reads it live from the
  // court's eCourts site, which can take a minute or more. That fetch goes on in the background
  // and saves the PDF; the app is told "pending" and asks again shortly.
  const { job } = await startOrderFetch(db, row, path);
  const done = await Promise.race([job, pause(ORDER_WAIT_MS).then(() => false)]);
  if (!done) {
    await background(job.catch(() => undefined));
    return { pending: true };
  }
  const link = await signed();
  if (!link.data?.signedUrl)
    throw new Failure(500, 'LINK_FAILED', "Couldn't open the order. Please try again.");
  return { url: link.data.signedUrl };
}

/** Opening a case: save its due orders in the background, so "View" opens instantly. */
async function prefetch(db: SupabaseClient, caseId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(caseId)) throw new Failure(422, 'BAD_REQUEST', 'Unknown case.');
  const due = (await unsavedOrders(db, caseId)).filter((r) => isDue(r));
  await background(syncCaseOrders(db, due));
  return { queued: due.length };
}

/**
 * The pg_cron job: save every advocate's due orders, a case at a time, within about two minutes.
 * Courts eCourts can't reach are tried again later, with a growing gap.
 */
async function syncOrders() {
  const db = adminClient();
  const { data, error } = await db
    .from('case_orders')
    .select(ORDER_SELECT)
    .is('document_id', null)
    .order('last_tried_at', { ascending: true, nullsFirst: true })
    .limit(500);
  if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read unsaved orders.");
  const now = Date.now();
  const byCase = new Map<string, OrderRow[]>();
  for (const r of (data ?? []) as unknown as OrderRow[])
    if (isDue(r, now)) byCase.set(r.case_id, [...(byCase.get(r.case_id) ?? []), r]);
  const deadline = now + 120_000;
  await background(
    (async () => {
      for (const rows of byCase.values()) {
        if (Date.now() > deadline) break;
        if (!(await syncCaseOrders(db, rows))) break;
      }
    })(),
  );
  return { cases: byCase.size };
}

// ---------------------------------------------------------------------------------------------
// Automatic case updates from the court (the advocate no longer records outcomes or next dates)
// ---------------------------------------------------------------------------------------------

/** A case is read from eCourts again after this long. */
const CASE_SYNC_EVERY_MS = 20 * 60 * 60 * 1000;
/** Opening a case re-reads it when its last read is older than this. */
const CASE_OPEN_SYNC_MS = 6 * 60 * 60 * 1000;
/** Cases per background run (app start). */
const CASE_SYNC_BATCH = 15;

type SyncCase = {
  id: string;
  cnr_number: string;
  status: string;
  court_room: string | null;
  judge_name: string | null;
  stage: string | null;
  filing_number: string | null;
  ecourts_status: string | null;
  ecourts_synced_at: string | null;
};
type SyncHearing = { id: string; hearing_date: string; completed_at: string | null; court_business: string | null; purpose: string | null };

/** Today in India, 'YYYY-MM-DD'. */
const todayIst = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** What the court recorded, as one of the app's outcomes (default: adjourned to the next date). */
function outcomeOf(business: string | undefined, disposedOn: string | undefined, date: string) {
  const b = (business ?? '').toLowerCase();
  if (disposedOn && disposedOn === date) return 'disposed';
  if (/\breserved\b/.test(b)) return 'reserved';
  if (/\bevidence\b/.test(b)) return 'evidence';
  if (/arguments? (heard|over|concluded|done)/.test(b)) return 'arguments_done';
  if (/\bheard\b/.test(b)) return 'heard';
  if (/not reached|not taken up|board not/.test(b)) return 'not_reached';
  return 'adjourned';
}

/**
 * Brings one saved case in line with the court: court room, judge, stage and status; each past
 * listing closed with what the court recorded; the next date added; new orders listed; disposal.
 */
async function applyCourtRecord(db: SupabaseClient, c: SyncCase, d: ec.EcourtsCase) {
  const today = todayIst();
  const { data: hs, error } = await db.from('hearings').select('id, hearing_date, completed_at, court_business, purpose').eq('case_id', c.id);
  if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read the case's hearings.");
  const byDate = new Map(((hs ?? []) as SyncHearing[]).map((h) => [h.hearing_date, h]));
  const room = d.courtNo ?? c.court_room;

  const listed = new Map(d.hearings.map((h) => [h.date, h]));
  if (d.nextHearingDate && !listed.has(d.nextHearingDate)) listed.set(d.nextHearingDate, { date: d.nextHearingDate, purpose: d.stage });

  for (const h of [...listed.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    const have = byDate.get(h.date);
    const past = h.date < today;
    const outcome = outcomeOf(h.business, d.decisionDate, h.date);
    if (!have) {
      await db.from('hearings').insert({
        case_id: c.id,
        hearing_date: h.date,
        purpose: h.purpose ?? null,
        court_room: room,
        court_business: h.business ?? null,
        outcome: past ? outcome : null,
        completed_at: past ? `${h.date}T18:00:00+05:30` : null,
      });
    } else if (past && !have.completed_at) {
      await db
        .from('hearings')
        .update({ outcome, completed_at: `${h.date}T18:00:00+05:30`, court_business: h.business ?? have.court_business })
        .eq('id', have.id);
    } else if ((h.business && h.business !== have.court_business) || (h.purpose && !have.purpose)) {
      await db
        .from('hearings')
        .update({ court_business: h.business ?? have.court_business, purpose: have.purpose ?? h.purpose ?? null })
        .eq('id', have.id);
    }
  }

  const disposed = !!d.decisionDate && c.status !== 'disposed';
  await db
    .from('cases')
    .update({
      court_room: room,
      judge_name: d.judge ?? c.judge_name,
      stage: (disposed ? d.disposal : undefined) ?? d.stage ?? c.stage,
      filing_number: d.filingNumber ?? c.filing_number,
      ecourts_status: d.status ?? c.ecourts_status,
      ecourts_synced_at: new Date().toISOString(),
      ...(disposed ? { status: 'disposed', disposal_date: d.decisionDate, disposal_result: 'other' } : {}),
    })
    .eq('id', c.id);

  if (d.orders.length)
    await db.from('case_orders').upsert(
      d.orders.map((o) => ({ case_id: c.id, order_date: o.date, kind: o.kind, description: o.description ?? null, file_name: o.file })),
      { onConflict: 'case_id,file_name', ignoreDuplicates: true },
    );
}

/** Reads one case from eCourtsIndia (after asking it to re-read the court, when `refreshed`). */
async function readCourtRecord(cnr: string): Promise<ec.EcourtsCase | null> {
  const res = await api(`/api/partner/case/${cnr}`).catch((e) => {
    if (e instanceof Failure && e.code === 'NOT_FOUND') return null;
    throw e;
  });
  if (!res) return null;
  const data = ((await body(res)).data ?? null) as Json | null;
  return data?.courtCaseData ? ec.toCase(cnr, data as ec.Json) : null;
}

/** Asks eCourtsIndia to re-read these cases from the court (async there, ~10 s). */
async function requestRefresh(cnrs: string[]) {
  if (cnrs.length === 1) await api(`/api/partner/case/${cnrs[0]}/refresh`, { method: 'POST' }).catch(() => null);
  else if (cnrs.length > 1)
    await api('/api/partner/case/bulk-refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnrs }),
    }).catch(() => null);
}

const SYNC_SELECT = 'id, cnr_number, status, court_room, judge_name, stage, filing_number, ecourts_status, ecourts_synced_at';

async function syncOne(db: SupabaseClient, c: SyncCase) {
  const d = await readCourtRecord(c.cnr_number);
  if (d) await applyCourtRecord(db, c, d);
  else await db.from('cases').update({ ecourts_synced_at: new Date().toISOString() }).eq('id', c.id);
  return !!d;
}

/**
 * Updates the caller's cases from the court.
 * - `caseIds` (a case being opened, or Refresh): those cases, now; waits and answers when done.
 *   `force` skips the "read in the last 6 hours" check (Refresh).
 * - Otherwise (app start): the caller's active cases with a CNR not read in the last 20 hours,
 *   soonest hearing first, up to 15, in the background.
 */
async function syncCases(db: SupabaseClient, input: Json) {
  const ids = strs(input.caseIds).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 5);
  const now = Date.now();

  if (ids.length) {
    const { data, error } = await db.from('cases').select(SYNC_SELECT).in('id', ids).not('cnr_number', 'is', null);
    if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read the case.");
    const due = ((data ?? []) as SyncCase[]).filter(
      (c) => input.force === true || !c.ecourts_synced_at || now - Date.parse(c.ecourts_synced_at) > CASE_OPEN_SYNC_MS,
    );
    if (!due.length) return { updated: 0 };
    // Fast: apply eCourtsIndia's saved copy now (about a second) so the screen updates at once.
    // Then ask it to re-read the court and apply that too, in the background (the app looks again
    // a little later).
    let updated = 0;
    for (const c of due) if (await syncOne(db, c)) updated += 1;
    await background(
      (async () => {
        await requestRefresh(due.map((c) => c.cnr_number));
        await pause(10_000);
        for (const c of due) await syncOne(db, c).catch(() => undefined);
      })(),
    );
    return { updated, refreshing: true };
  }

  const cutoff = new Date(now - CASE_SYNC_EVERY_MS).toISOString();
  const { data, error } = await db
    .from('cases')
    .select(SYNC_SELECT)
    .eq('status', 'active')
    .is('archived_at', null)
    .not('cnr_number', 'is', null)
    .or(`ecourts_synced_at.is.null,ecourts_synced_at.lt.${cutoff}`)
    .order('next_hearing_at', { ascending: true, nullsFirst: true })
    .limit(CASE_SYNC_BATCH);
  if (error) throw new Failure(500, 'DB_ERROR', "Couldn't read your cases.");
  const due = (data ?? []) as SyncCase[];
  if (!due.length) return { queued: 0 };
  await background(
    (async () => {
      await requestRefresh(due.map((c) => c.cnr_number));
      await pause(12_000);
      for (const c of due) {
        try {
          await syncOne(db, c);
        } catch (e) {
          if (FATAL.includes(codeOf(e))) break;
        }
        await pause(400);
      }
    })(),
  );
  return { queued: due.length };
}

// ---------------------------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Use POST');

  let input: Json;
  try {
    input = (await req.json()) as Json;
  } catch {
    return fail(400, 'BAD_REQUEST', 'Send JSON with an "action".');
  }

  // The order sync job proves itself with a shared secret instead of a user session.
  if (input.action === 'syncOrders') {
    const secret = Deno.env.get('ECOURTS_CRON_SECRET');
    if (!secret || req.headers.get('x-cron-secret') !== secret)
      return fail(401, 'UNAUTHENTICATED', 'Not the sync job.');
    try {
      return json(200, { data: await syncOrders() });
    } catch (e) {
      if (e instanceof Failure) return fail(e.status, e.code, e.message);
      console.error(e);
      return fail(500, 'INTERNAL_ERROR', 'Sync failed.');
    }
  }

  const caller = await callerClient(req).catch(() => null);
  if (!caller) return fail(401, 'UNAUTHENTICATED', 'Sign in to use eCourts.');

  try {
    const state = str(input.state)?.toUpperCase();
    const district = str(input.district);
    switch (input.action) {
      case 'states':
        return json(200, { data: await states() });
      case 'allDistricts':
        return json(200, { data: await allDistricts() });
      case 'districts':
        if (!state || !CODE.test(state)) return fail(422, 'BAD_REQUEST', 'Pick a state.');
        return json(200, { data: await districts(state) });
      case 'complexes':
        if (!state || !CODE.test(state) || !district || !CODE.test(district))
          return fail(422, 'BAD_REQUEST', 'Pick a district.');
        return json(200, { data: await complexes(state, district) });
      case 'caseTypes':
        return json(200, { data: await caseTypes() });
      case 'syncCourts':
        return json(200, { data: await syncCourts() });
      case 'search':
        return json(200, { data: await search(input as unknown as SearchInput) });
      case 'prefetch':
        return json(200, { data: await prefetch(caller.db, String(input.caseId ?? '')) });
      case 'order':
        return json(200, { data: await order(caller.db, String(input.orderId ?? '')) });
      case 'orderLink':
        return json(200, { data: await orderLink(caller.db, String(input.orderId ?? '')) });
      case 'syncCases':
        return json(200, { data: await syncCases(caller.db, input) });
      case 'warmOrders':
        return json(200, { data: await warmOrders(caller.db, String(input.caseId ?? '')) });
      default:
        return fail(400, 'BAD_REQUEST', 'Unknown action.');
    }
  } catch (e) {
    if (e instanceof Failure) return fail(e.status, e.code, e.message);
    console.error(e);
    return fail(500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
  }
});
