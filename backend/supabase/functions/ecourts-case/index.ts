// ecourts-case: look up a case on eCourts by CNR (FR-CASE-03 auto-fill, Refresh from eCourts).
//
// POST { "cnr": "GJAH010012342025" }                ->  { "data": EcourtsCase }
// POST { "cnr": "GJAH010012342025", "fresh": true } ->  asks eCourtsIndia to re-read the case from
//                                                       eCourts first (~10 s), for new dates and orders.
//
// The eCourtsIndia partner API key lives only here, as the ECOURTS_API_KEY secret
// (Dashboard > Edge Functions > Secrets). The app never sees it. Only signed-in users can
// call this function: the gateway also lets publishable-key (anon) calls through, so the
// handler confirms the caller's session with Supabase Auth before spending eCourts credits.

import { str, toCase, type Json } from '../_shared/ecourtsCase.ts';

const API_BASE = 'https://webapi.ecourtsindia.com';
const CNR = /^[A-Z0-9]{16}$/;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (status: number, body: Json) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const fail = (status: number, code: string, message: string) =>
  json(status, { error: { code, message } });

/** True when the Authorization header carries a valid session of a signed-in user. */
async function isSignedIn(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const publishable = (() => {
    try {
      return (
        JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') ?? '{}') as Record<string, string>
      ).default;
    } catch {
      return undefined;
    }
  })();
  const apikey = publishable ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: { Authorization: auth, apikey },
  }).catch(() => null);
  if (!res?.ok) return false;
  const user = (await res.json().catch(() => null)) as Json | null;
  return typeof user?.id === 'string' && user?.is_anonymous !== true;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return fail(405, 'METHOD_NOT_ALLOWED', 'Use POST');
  if (!(await isSignedIn(req))) return fail(401, 'UNAUTHENTICATED', 'Sign in to look up cases.');

  // Tolerate common paste mistakes: spaces / newlines, quotes, "Bearer " or "ECOURTS_API_KEY=" in front.
  const key = Deno.env
    .get('ECOURTS_API_KEY')
    ?.replace(/\s+/g, '')
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/^(ECOURTS_API_KEY=|Bearer)/i, '')
    .replace(/^['"]+|['"]+$/g, '');
  // Safe to show: never the key itself, only its shape.
  const keyShape = key
    ? `stored key is ${key.length} characters${key.startsWith('eci_live_') ? '' : ' and does not start with eci_live_'}`
    : '';
  if (!key) return fail(503, 'NOT_CONFIGURED', 'eCourts lookup is not set up yet.');

  let cnr = '';
  let fresh = false;
  try {
    const input = (await req.json()) as Json;
    cnr = String(input.cnr ?? '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    fresh = input.fresh === true;
  } catch {
    return fail(400, 'BAD_REQUEST', 'Send JSON: { "cnr": "..." }');
  }
  if (!CNR.test(cnr)) return fail(422, 'INVALID_CNR', 'CNR must be 16 letters and numbers.');

  const headers = { Authorization: `Bearer ${key}`, Accept: 'application/json' };
  const getCase = () => fetch(`${API_BASE}/api/partner/case/${cnr}`, { headers });
  const hasCase = async (r: Response) =>
    r.ok &&
    !!(
      (
        (await r
          .clone()
          .json()
          .catch(() => null)) as Json | null
      )?.data as Json | undefined
    )?.courtCaseData;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  let res: Response;
  try {
    if (fresh) {
      // Refresh from eCourts: queue a re-read (cheap), give it the documented 5-10 s, then read the case.
      const queued = await fetch(`${API_BASE}/api/partner/case/${cnr}/refresh`, {
        method: 'POST',
        headers,
      }).catch(() => null);
      if (queued?.ok) await sleep(9000);
    }
    res = await getCase();
    // eCourtsIndia serves its own copy of eCourts. A case it hasn't stored yet comes back as not found:
    // ask it to fetch the case from eCourts (takes ~5-10 s), then read it again.
    if (res.status === 404 || (res.ok && !(await hasCase(res)))) {
      await fetch(`${API_BASE}/api/partner/case/${cnr}/refresh`, { method: 'POST', headers }).catch(
        () => null,
      );
      for (let attempt = 0; attempt < 5; attempt++) {
        await sleep(5000);
        res = await getCase();
        if (res.status !== 404 && (!res.ok || (await hasCase(res)))) break;
      }
    }
  } catch {
    return fail(502, 'UPSTREAM_UNREACHABLE', "Couldn't reach eCourts. Please try again.");
  }

  // eCourtsIndia's own explanation (never contains our key), shown to help fix setup problems.
  const reason = async () => {
    const text = await res.text().catch(() => '');
    try {
      const b = JSON.parse(text) as Json;
      const e = (b.error ?? b) as Json;
      return str(e.message) ?? str(b.message) ?? str(e.code) ?? text.slice(0, 160);
    } catch {
      return text.slice(0, 160);
    }
  };
  const notFound = () =>
    fail(
      404,
      'NOT_FOUND',
      'eCourtsIndia has not fetched this case yet. It has been asked to; try again in a minute.',
    );
  if (res.status === 404) return notFound();
  if (res.status === 401)
    return fail(
      502,
      'UPSTREAM_AUTH',
      `eCourtsIndia rejected the API key (401): ${await reason()}. The ${keyShape}; a valid key is 41 characters starting with eci_live_.`,
    );
  if (res.status === 402)
    return fail(502, 'UPSTREAM_CREDITS', 'The eCourts API account is out of credits.');
  if (res.status === 403)
    return fail(
      502,
      'UPSTREAM_FORBIDDEN',
      `eCourtsIndia refused the request (403): ${await reason()}`,
    );
  if (res.status === 429)
    return fail(429, 'RATE_LIMITED', 'Too many eCourts lookups. Try again in a minute.');
  if (!res.ok)
    return fail(502, 'UPSTREAM_ERROR', `eCourts lookup failed (${res.status}): ${await reason()}`);

  const body = (await res.json().catch(() => null)) as Json | null;
  const data = (body?.data ?? null) as Json | null;
  if (!data?.courtCaseData) return notFound();

  return json(200, { data: toCase(cnr, data) });
});
