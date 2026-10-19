import { caseNumberSchema, cnrSchema } from '@vakil/shared';
import type { Case, NewCase } from '@/services/types';

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
  /** Hearing history fetched from eCourts (Add case only). */
  history: { date: string; purpose?: string }[];
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
  history: [],
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
  history: [],
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
  history: v.history ?? [], // drafts saved before this field existed have none
});

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
  if (sections.includes('parties')) {
    if (v.clientIds.length === 0) e.clientIds = 'Add at least one client';
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

/** The single case form: every field is required (title, CNR, type, court, filing date, client). */
export function validateCase(v: CaseFormValues): CaseFormErrors {
  const e: CaseFormErrors = {};
  if (!v.title.trim()) e.title = 'Enter the case title';
  if (!v.cnr) e.cnr = 'Enter the CNR number';
  else if (!cnrSchema.safeParse(v.cnr.toUpperCase()).success) e.cnr = 'CNR must be 16 characters';
  if (!v.caseTypeId) e.caseTypeId = 'Select a case type';
  if (!v.courtId) e.courtId = 'Select a court';
  if (!v.filingDate) e.filingDate = 'Select the filing date';
  if (v.clientIds.length === 0) e.clientIds = 'Add at least one client';
  return e;
}
