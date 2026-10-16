// ecourts-case: look up a case on eCourts by CNR (FR-CASE-03 auto-fill).
//
// POST { "cnr": "GJAH010012342025" }  ->  { "data": EcourtsCase }
//
// The eCourtsIndia partner API key lives only here, as the ECOURTS_API_KEY secret
// (Dashboard > Edge Functions > Secrets). The app never sees it. Only signed-in users can
// call this function: the gateway also lets publishable-key (anon) calls through, so the
// handler confirms the caller's session with Supabase Auth before spending eCourts credits.

const API_BASE = 'https://webapi.ecourtsindia.com';
const CNR = /^[A-Z0-9]{16}$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Json = Record<string, unknown>;

const json = (status: number, body: Json) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const fail = (status: number, code: string, message: string) => json(status, { error: { code, message } });

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => !!x) : []);
/** Provider dates may be ISO timestamps or plain dates; the app wants 'YYYY-MM-DD'. */
const day = (v: unknown) => {
  const s = str(v);
  const m = s && /^(\d{4}-\d{2}-\d{2})/.exec(s);
  return m ? m[1] : undefined;
};

/** The subset of the eCourtsIndia case record the app uses, in the app's own words. */
function toCase(cnr: string, d: Json) {
  const c = (d.courtCaseData ?? {}) as Json;
  const e = (d.entityInfo ?? {}) as Json;
  const year = Number(c.cnrYear);
  const history = Array.isArray(c.historyOfCaseHearings) ? (c.historyOfCaseHearings as Json[]) : [];
  return {
    cnr,
    caseNumber: str(c.caseNumber) ?? str(c.registrationNumber) ?? str(c.filingNumber),
    caseYear: Number.isInteger(year) && year > 1900 ? year : undefined,
    caseType: str(c.caseType) ?? str(c.caseTypeRaw),
    filingDate: day(c.filingDate) ?? day(c.registrationDate),
    petitioners: strs(c.petitioners),
    respondents: strs(c.respondents),
    petitionerAdvocates: strs(c.petitionerAdvocates),
    respondentAdvocates: strs(c.respondentAdvocates),
    judge: strs(c.judges)[0],
    courtName: str(c.courtName),
    courtNo: str(c.courtNo),
    district: str(c.district),
    state: str(c.state),
    status: str(c.caseStatus),
    stage: str(c.purpose),
    decisionDate: day(c.decisionDate),
    nextHearingDate: day(c.nextHearingDate) ?? day(e.nextHearingDate),
    lastHearingDate: day(c.lastHearingDate) ?? day(e.lastHearingDate),
    hearings: history
      .map((h) => ({ date: day(h.hearingDate) ?? day(h.businessOnDate), purpose: str(h.purposeOfListing), judge: str(h.judge) }))
      .filter((h) => h.date),
  };
}

/** True when the Authorization header carries a valid session of a signed-in user. */
async function isSignedIn(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const publishable = (() => {
    try {
      return (JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>).default;
    } catch {
      return undefined;
    }
  })();
  const apikey = publishable ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, { headers: { Authorization: auth, apikey } }).catch(() => null);
  if (!res?.ok) return false;
  const user = (await res.json().catch(() => null)) as Json | null;
  return typeof user?.id === 'string' && user?.is_anonymous !== true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!(await isSignedIn(req))) return fail(401, 'UNAUTHENTICATED', 'Sign in to look up cases.');

  const key = Deno.env.get('ECOURTS_API_KEY');
  if (!key) return fail(503, 'NOT_CONFIGURED', 'eCourts lookup is not set up yet.');

  let cnr = '';
  try {
    cnr = String(((await req.json()) as Json).cnr ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  } catch {
    return fail(400, 'BAD_REQUEST', 'Send JSON: { "cnr": "..." }');
  }
  if (!CNR.test(cnr)) return fail(422, 'INVALID_CNR', 'CNR must be 16 letters and numbers.');

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api/partner/case/${cnr}`, { headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' } });
  } catch {
    return fail(502, 'UPSTREAM_UNREACHABLE', "Couldn't reach eCourts. Please try again.");
  }

  if (res.status === 404) return fail(404, 'NOT_FOUND', 'No case found for this CNR on eCourts.');
  if (res.status === 401 || res.status === 403) return fail(502, 'UPSTREAM_AUTH', 'The eCourts API key was rejected. Check the ECOURTS_API_KEY secret.');
  if (res.status === 402) return fail(502, 'UPSTREAM_CREDITS', 'The eCourts API account is out of credits.');
  if (res.status === 429) return fail(429, 'RATE_LIMITED', 'Too many eCourts lookups. Try again in a minute.');
  if (!res.ok) return fail(502, 'UPSTREAM_ERROR', `eCourts lookup failed (${res.status}). Please try again.`);

  const body = (await res.json().catch(() => null)) as Json | null;
  const data = (body?.data ?? null) as Json | null;
  if (!data?.courtCaseData) return fail(404, 'NOT_FOUND', 'No case found for this CNR on eCourts.');

  return json(200, { data: toCase(cnr, data) });
});
