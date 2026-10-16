import { todayISO } from '@/utils/date';
import { unwrap } from './api';
import { listHearings, type HearingRow } from './hearings';
import { supabase } from './supabase';
import type { DashboardData } from './types';

/** Home screen (FR-DASH-01..05): counts come from the dashboard_stats RPC, today's list from the hearings query. */
export async function getDashboard(): Promise<DashboardData & { todayRows: HearingRow[] }> {
  const t = todayISO();
  const [stats, todayRows] = await Promise.all([unwrap(supabase.rpc('dashboard_stats')), listHearings(t, t)]);
  return { ...(stats as unknown as DashboardData), todayRows };
}

export type SearchResults = {
  cases: { id: string; title: string; caseNumber?: string; court?: string }[];
  clients: { id: string; fullName: string; phone: string }[];
  notes: { id: string; caseId: string; title?: string; body: string; caseTitle?: string }[];
};

/** Global search across cases, clients and notes (FR-SRCH-01, P1), via the search_all RPC. */
export async function searchAll(q: string): Promise<SearchResults> {
  if (!q.trim()) return { cases: [], clients: [], notes: [] };
  const res = (await unwrap(supabase.rpc('search_all', { p_q: q }))) as unknown as SearchResults;
  // The RPC returns SQL nulls; the screens expect missing optional fields to be undefined.
  return {
    cases: res.cases.map((c) => ({ ...c, caseNumber: c.caseNumber ?? undefined, court: c.court ?? undefined })),
    clients: res.clients,
    notes: res.notes.map((n) => ({ ...n, title: n.title ?? undefined, caseTitle: n.caseTitle ?? undefined })),
  };
}
