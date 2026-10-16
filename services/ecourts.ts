import { FunctionsHttpError } from '@supabase/supabase-js';
import { ApiError, errorMessage } from './api';
import { supabase } from './supabase';
import type { ISODate } from './types';

/** A case as returned by the ecourts-case Edge Function (eCourtsIndia data, normalised). */
export type EcourtsCase = {
  cnr: string;
  caseNumber?: string;
  caseYear?: number;
  caseType?: string;
  filingDate?: ISODate;
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
  nextHearingDate?: ISODate;
  lastHearingDate?: ISODate;
  hearings: { date: ISODate; purpose?: string; judge?: string }[];
};

/**
 * FR-CASE-03: looks a case up on eCourts by its 16-character CNR. The API key stays in the
 * ecourts-case Edge Function; the app only sends the CNR with the user's session.
 */
export async function fetchCaseByCnr(cnr: string): Promise<EcourtsCase> {
  const { data, error } = await supabase.functions.invoke<{ data: EcourtsCase }>('ecourts-case', { body: { cnr } });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
      throw new ApiError(res.status, body?.error?.code ?? 'ECOURTS_ERROR', body?.error?.message ?? "Couldn't fetch this case from eCourts.");
    }
    throw new ApiError(0, 'NETWORK', /fetch|network/i.test(errorMessage(error)) ? "Can't reach the server. Check your connection and try again." : errorMessage(error));
  }
  if (!data?.data) throw new ApiError(404, 'NOT_FOUND', 'No case found for this CNR on eCourts.');
  return data.data;
}
