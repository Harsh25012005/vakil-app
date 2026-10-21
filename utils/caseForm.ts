import { caseNumberSchema, cnrSchema } from '@vakil/shared';
import type { EcourtsCase } from '@/services/ecourts';
import type { Case, EcourtsOrderRef, NewCase } from '@/services/types';

/** Form state for adding / editing a case. Everything is a string or null so inputs bind directly. */
export type CaseFormValues = {
  title: string;
  caseNumber: string;
  caseYear: string;
  cnr: string;
  caseTypeId: string;
  courtId: string;
  courtRoom: string;
  judge: string;
  filingDate: string | null;
  petitioner: string;
  respondent: string;
  oppositeCounsel: string;
  clientIds: string[];
  stage: string;
  nextHearingDate: string | null;
  nextHearingPurpose: string;
  filingNumber: string;
  ecourtsStatus: string;
  /** Set when the form was filled from eCourts. */
  ecourtsSyncedAt: string | null;
  /** Hearing history fetched from eCourts (Add case only). */
  history: { date: string; purpose?: string; business?: string }[];
  /** Orders and judgments on eCourts (Add case only). */
  orders: EcourtsOrderRef[];
};

export type CaseFormErrors = Partial<Record<keyof CaseFormValues, string>>;

export const emptyCaseForm = (defaults: Partial<CaseFormValues> = {}): CaseFormValues => ({
  title: '',
  caseNumber: '',
  caseYear: String(new Date().getFullYear()),
  cnr: '',
  caseTypeId: '',
  courtId: '',
  courtRoom: '',
  judge: '',
  filingDate: null,
  petitioner: '',
  respondent: '',
  oppositeCounsel: '',
  clientIds: [],
  stage: '',
  nextHearingDate: null,
  nextHearingPurpose: '',
  filingNumber: '',
  ecourtsStatus: '',
  ecourtsSyncedAt: null,
  history: [],
  orders: [],
  ...defaults,
});

export const formFromCase = (c: Case): CaseFormValues => ({
  title: c.title,
  caseNumber: c.caseNumber ?? '',
  caseYear: c.caseYear ? String(c.caseYear) : '',
  cnr: c.cnr ?? '',
  caseTypeId: c.caseTypeId,
  courtId: c.courtId,
  courtRoom: c.courtRoom ?? '',
  judge: c.judge ?? '',
  filingDate: c.filingDate ?? null,
  petitioner: c.petitioner ?? '',
  respondent: c.respondent ?? '',
  oppositeCounsel: c.oppositeCounsel ?? '',
  clientIds: c.clientIds,
  stage: c.stage ?? '',
  nextHearingDate: c.nextHearingAt,
  nextHearingPurpose: '',
  filingNumber: c.filingNumber ?? '',
  ecourtsStatus: c.ecourtsStatus ?? '',
  ecourtsSyncedAt: c.ecourtsSyncedAt ?? null,
  history: [],
  orders: [],
});

export const toNewCase = (v: CaseFormValues): NewCase => ({
  title: v.title,
  caseNumber: v.caseNumber,
  caseYear: v.caseYear ? Number(v.caseYear) : undefined,
  cnr: v.cnr,
  caseTypeId: v.caseTypeId,
  courtId: v.courtId,
  courtRoom: v.courtRoom,
  judge: v.judge,
  filingDate: v.filingDate ?? undefined,
  petitioner: v.petitioner,
  respondent: v.respondent,
  oppositeCounsel: v.oppositeCounsel,
  clientIds: v.clientIds,
  stage: v.stage,
  nextHearingDate: v.nextHearingDate ?? undefined,
  nextHearingPurpose: v.nextHearingPurpose,
  filingNumber: v.filingNumber ?? '',
  ecourtsStatus: v.ecourtsStatus ?? '',
  ecourtsSyncedAt: v.ecourtsSyncedAt ?? undefined,
  history: v.history ?? [], // drafts saved before this field existed have none
  orders: v.orders ?? [],
});

/**
 * The form fields an eCourts case fills in. Only an upcoming date becomes the next hearing; a past
 * one is history, not something to attend. Court and case type are resolved by the caller.
 */
export function formPatchFromEcourts(d: EcourtsCase, v: CaseFormValues, today: string): Partial<CaseFormValues> {
  const upcoming = d.nextHearingDate && d.nextHearingDate >= today ? d.nextHearingDate : undefined;
  const petitioner = d.petitioners[0] ?? '';
  const respondent = d.respondents[0] ?? '';
  const patch: Partial<CaseFormValues> = {
    cnr: d.cnr,
    caseNumber: d.caseNumber ?? v.caseNumber,
    caseYear: d.caseYear ? String(d.caseYear) : v.caseYear,
    filingNumber: d.filingNumber ?? v.filingNumber,
    filingDate: d.filingDate ?? v.filingDate,
    petitioner: petitioner || v.petitioner,
    respondent: respondent || v.respondent,
    judge: d.judge ?? v.judge,
    courtRoom: d.courtNo ?? v.courtRoom,
    stage: d.stage ?? v.stage,
    ecourtsStatus: d.status ?? v.ecourtsStatus,
    ecourtsSyncedAt: new Date().toISOString(),
    nextHearingDate: upcoming ?? v.nextHearingDate,
    nextHearingPurpose: upcoming ? (d.hearings.find((h) => h.date === upcoming)?.purpose ?? d.stage ?? '') : v.nextHearingPurpose,
    history: d.hearings.map((h) => ({ date: h.date, purpose: h.purpose, business: h.business })),
    orders: d.orders,
  };
  if (!v.title.trim() && (petitioner || respondent)) {
    // "A v. B" with "and others" when eCourts lists more parties.
    const side = (first: string, all: string[]) => (all.length > 1 ? `${first} and others` : first);
    patch.title = [petitioner && side(petitioner, d.petitioners), respondent && side(respondent, d.respondents)].filter(Boolean).join(' v. ');
  }
  return patch;
}

/** The four form sections; the add flow shows one per step, the edit screen shows all of them. */
export type CaseSection = 'basics' | 'court' | 'parties' | 'stage';

const maxYear = () => new Date().getFullYear() + 1;

/** Field rules from FRS 9.1 and FR-CASE-02/03. Returns a message per invalid field. */
export function validateCaseForm(v: CaseFormValues, sections: CaseSection[]): CaseFormErrors {
  const e: CaseFormErrors = {};
  if (sections.includes('basics')) {
    if (!v.caseTypeId) e.caseTypeId = 'Select a case type';
    if (v.caseNumber && !caseNumberSchema.safeParse(v.caseNumber).success) e.caseNumber = 'Use letters, numbers, / or -';
    if (v.caseYear) {
      const y = Number(v.caseYear);
      if (!Number.isInteger(y) || y < 1950 || y > maxYear()) e.caseYear = `Enter a year between 1950 and ${maxYear()}`;
    }
    if (v.cnr && !cnrSchema.safeParse(v.cnr.toUpperCase()).success) e.cnr = 'CNR must be 16 characters';
  }
  if (sections.includes('court')) {
    if (!v.courtId) e.courtId = 'Select a court';
  }
  return e;
}

/** FR-CASE-02: a case needs a title or at least one party name. */
export const hasIdentity = (v: CaseFormValues) => !!(v.title.trim() || v.petitioner.trim() || v.respondent.trim());

export const STAGES = ['Filing', 'Notice', 'Written statement', 'Issues', 'Evidence', 'Arguments', 'Orders', 'Execution'];

/** Fields the Edit case screen can change. Hearings (and so the next date) are managed on their own tab. */
export const toCasePatch = (v: CaseFormValues) => {
  const n = toNewCase(v);
  return {
    title: n.title,
    caseNumber: n.caseNumber?.trim() || undefined,
    caseYear: n.caseYear,
    cnr: n.cnr?.trim().toUpperCase() || undefined,
    filingNumber: n.filingNumber?.trim() || undefined,
    caseTypeId: n.caseTypeId,
    courtId: n.courtId,
    courtRoom: n.courtRoom?.trim() || undefined,
    judge: n.judge?.trim() || undefined,
    filingDate: n.filingDate,
    petitioner: n.petitioner?.trim() || undefined,
    respondent: n.respondent?.trim() || undefined,
    oppositeCounsel: n.oppositeCounsel?.trim() || undefined,
    clientIds: n.clientIds,
    stage: n.stage?.trim() || undefined,
  };
};

/** The single case form: title, CNR, type, court and filing date are required; clients are optional. */
export function validateCase(v: CaseFormValues): CaseFormErrors {
  const e: CaseFormErrors = {};
  if (!v.title.trim()) e.title = 'Enter the case title';
  if (!v.cnr) e.cnr = 'Enter the CNR number';
  else if (!cnrSchema.safeParse(v.cnr.toUpperCase()).success) e.cnr = 'CNR must be 16 characters';
  if (!v.caseTypeId) e.caseTypeId = 'Select a case type';
  if (!v.courtId) e.courtId = 'Select a court';
  if (!v.filingDate) e.filingDate = 'Select the filing date';
  return e;
}
