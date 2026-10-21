// The eCourtsIndia case record, read into the app's own words. Shared by ecourts-case (Add case
// lookup, Refresh) and ecourts (automatic updates of saved cases).

export type Json = Record<string, unknown>;

// Text fields sometimes arrive as numbers (courtNo: 2).
export const str = (v: unknown) =>
  typeof v === 'number' && Number.isFinite(v)
    ? String(v)
    : typeof v === 'string' && v.trim()
      ? v.trim()
      : undefined;
const strs = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => !!x) : []);

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Court data uses several date styles: "2024-03-15", "2024-03-15T00:00:00Z", "15-03-2024",
 * "15/03/2024", "15th March 2024". The app wants 'YYYY-MM-DD'.
 */
export function day(v: unknown): string | undefined {
  const s = str(v);
  if (!s) return undefined;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(s);
  if (m) return `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
  m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3})[A-Za-z]*,?\s+(\d{4})/.exec(s);
  if (m) {
    const mon = MONTHS.indexOf(m[2]!.toLowerCase());
    if (mon >= 0) return `${m[3]}-${pad(mon + 1)}-${pad(Number(m[1]))}`;
  }
  return undefined;
}

/** business: what the court recorded that day ("NBW BE ISSUED."), from businessOnDateEntries. */
export type Hearing = { date: string; purpose?: string; judge?: string; business?: string };
export type Order = { date: string; kind: 'interim' | 'judgment'; description?: string; file: string };

const arr = (v: unknown) => (Array.isArray(v) ? (v as Json[]) : []);

/**
 * Each history row is one sitting: businessOnDate is the day the matter was taken up, hearingDate
 * the next date it was given (with purposeOfListing for that next date). Both are hearing dates;
 * keeping the businessOnDate too means the first sitting and every order date line up with a hearing.
 */
function hearingsOf(c: Json): Hearing[] {
  const byDate = new Map<string, Hearing>();
  const put = (h: Hearing) => {
    const had = byDate.get(h.date);
    byDate.set(h.date, {
      date: h.date,
      purpose: had?.purpose ?? h.purpose,
      judge: had?.judge ?? h.judge,
      business: had?.business ?? h.business,
    });
  };
  for (const h of arr(c.historyOfCaseHearings)) {
    const sat = day(h.businessOnDate);
    if (sat) put({ date: sat, judge: str(h.judge) });
    const next = day(h.hearingDate);
    if (next) put({ date: next, purpose: str(h.purposeOfListing) });
  }
  // The court's own record of each sitting. "--" means nothing was written that day.
  for (const e of arr(c.businessOnDateEntries)) {
    const date = day(e.date);
    const business = str(e.business)?.replace(/\s*\n\s*/g, ' ');
    if (date && business && business !== '--') put({ date, judge: str(e.courtOf), business });
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Orders the court uploaded. `file` is the bare name the order download endpoint takes. */
function ordersOf(c: Json): Order[] {
  const list = (rows: Json[], kind: Order['kind']) =>
    rows.flatMap((o): Order[] => {
      const date = day(o.orderDate);
      const file = str(o.orderUrl)?.split('/').pop();
      return date && file && /^[A-Za-z0-9._-]{1,200}$/.test(file)
        ? [{ date, kind, description: str(o.description) ?? str(o.orderType), file }]
        : [];
    });
  const seen = new Set<string>();
  const unique: Order[] = [];
  for (const o of [
    ...list(arr(c.interimOrders), 'interim'),
    ...list(arr(c.judgmentOrders), 'judgment'),
  ]) {
    if (seen.has(o.file)) continue;
    seen.add(o.file);
    unique.push(o);
  }
  return unique.sort((a, b) => a.date.localeCompare(b.date));
}

/** The subset of the eCourtsIndia case record the app uses, in the app's own words. */
export function toCase(cnr: string, d: Json) {
  const c = (d.courtCaseData ?? {}) as Json;
  const e = (d.entityInfo ?? {}) as Json;
  const lookup = (((d.descriptions ?? {}) as Json).enumLookup ?? {}) as Record<
    string,
    Record<string, string> | undefined
  >;
  const year = Number(c.cnrYear);
  const hearings = hearingsOf(c);
  const lastListed = hearings[hearings.length - 1];
  const typeCode = str(c.caseType);

  return {
    cnr,
    // registrationNumber is the case number advocates use ("24807/2016"); caseNumber is an internal id.
    caseNumber: str(c.registrationNumber) ?? str(c.filingNumber) ?? str(c.caseNumber),
    filingNumber: str(c.filingNumber),
    caseYear: Number.isInteger(year) && year > 1900 ? year : undefined,
    // A readable name ("Criminal Complaint Case"), not the search code ("CC").
    caseType:
      (typeCode ? str(lookup.caseType?.[typeCode]) : undefined) ?? str(c.caseTypeRaw) ?? typeCode,
    caseTypeCode: typeCode,
    courtCode: str(c.cnrCourtCode),
    filingDate: day(c.filingDate) ?? day(c.registrationDate),
    registrationDate: day(c.registrationDate),
    petitioners: strs(c.petitioners),
    respondents: strs(c.respondents),
    petitionerAdvocates: strs(c.petitionerAdvocates),
    respondentAdvocates: strs(c.respondentAdvocates),
    // The latest listing names the bench in full ("JUDGE, FAMILY COURT"); `judges` arrives split on commas.
    judge:
      [...hearings].reverse().find((h) => h.judge)?.judge ??
      (strs(c.judges).join(', ') || undefined),
    courtName: str(c.courtName),
    courtNo: str(c.courtNo),
    district: str(c.district),
    state: str(c.state),
    status: str(c.caseStatus),
    stage: str(c.purpose) ?? lastListed?.purpose,
    decisionDate: day(c.decisionDate),
    /** How it ended, in the court's words ("CONSIGNED AFTER PROCEEDING U/S 299 CR.P.C"). */
    disposal: str(c.disposalTypeRaw),
    nextHearingDate: day(c.nextHearingDate) ?? day(e.nextDateOfHearing) ?? day(e.nextHearingDate),
    lastHearingDate:
      day(c.lastHearingDate) ??
      day(e.lastDateOfHearing) ??
      day(e.lastHearingDate) ??
      lastListed?.date,
    hearings,
    orders: ordersOf(c),
    /** When eCourtsIndia last read the case from eCourts. */
    updatedAt: str(e.dateModified),
  };
}


export type EcourtsCase = ReturnType<typeof toCase>;
