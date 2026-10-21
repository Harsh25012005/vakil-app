import type { DirectoryCourt, EcourtsCaseType } from '@/services/ecourts';

/**
 * eCourtsIndia lists every case type in one list: court types (SCA, FA, CRA...) and each
 * tribunal's own (OA_DRT, CC_JAGRITI, CP_IBC...). These rules sort them by court, so a picker
 * shows only the types of the court the case is in.
 */

/** A tribunal's own case types, by its short name in the court directory. */
const TRIBUNAL_TYPES: Record<string, RegExp> = {
  DRT: /_DRT$/,
  DRAT: /_DRT$/,
  CAT: /_CAT$/,
  NCLT: /(^|_)(IBC|CA|LIQ|PREPACK)(_|$)|^IB_/,
  NCLAT: /(^|_)(IBC|CA|LIQ|PREPACK|AT|INS)(_|$)|^IB_|^COMP_APP/,
  NCDRC: /_JAGRITI$/,
  SCDRC: /_JAGRITI$/,
  TDSAT: /_TDSAT$/,
  APTEL: /_APTEL$/,
  CESTAT: /CESTAT/,
  SAT: /(_SAT|_SEBI)$/,
  NGT: /^NGT_/,
  AFT: /^AFT_/,
  ITAT: /^(ITA|ITSSA|ITTPA|ITITA|INTTA|STA|STTA|WTA|GTA|EDA|ETA|BMA)$/,
  RERA: /^RERA$/,
};

/** Types that only tribunals use; courts never show these. */
const TRIBUNAL_ONLY =
  /_(DRT|CAT|IBC|CA|JAGRITI|TDSAT|APTEL|CESTAT|SAT|SEBI|GSTAT|RCT|CCI|AT|LIQ|DIS|PLAN|PR|INS|GST)$|^(NGT|AFT|CESTAT|COMP|RULE63|IB)_|^IA_IBC|^(RERA|RCT)$/;

/** True when eCourtsIndia holds this tribunal's cases (it has case types of its own there). */
export const tribunalOnEcourts = (shortName?: string) => !!shortName && shortName in TRIBUNAL_TYPES;

/** The case types of one court: a tribunal's own, or the court types for every other court. */
export function caseTypesFor(court: Pick<DirectoryCourt, 'level' | 'shortName'> | null | undefined, all: EcourtsCaseType[]): EcourtsCaseType[] {
  if (court?.level === 'TRIBUNAL') {
    const family = court.shortName ? TRIBUNAL_TYPES[court.shortName] : undefined;
    return family ? all.filter((t) => family.test(t.code)) : [];
  }
  return all.filter((t) => !TRIBUNAL_ONLY.test(t.code));
}
