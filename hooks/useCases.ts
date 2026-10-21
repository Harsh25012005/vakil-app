import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as cases from '@/services/cases';
import { syncCases, warmCaseOrders } from '@/services/ecourts';
import * as hearings from '@/services/hearings';
import type { CaseFilters, CaseStatus, NewCase } from '@/services/types';
import type { DisposalResult } from '@vakil/shared';
import { qk } from './queryKeys';
import { refreshReminders } from './useReminders';

/** Everything that depends on cases/hearings must refresh together (lists, detail, calendar, dashboard). */
export function useRefreshCaseData() {
  const qc = useQueryClient();
  return (caseId?: string) => {
    refreshReminders(); // hearing dates may have moved
    return Promise.all([
      qc.invalidateQueries({ queryKey: qk.casesAll }),
      qc.invalidateQueries({ queryKey: qk.hearingsAll }),
      qc.invalidateQueries({ queryKey: qk.dashboard }),
      qc.invalidateQueries({ queryKey: qk.clientsAll }),
      caseId ? qc.invalidateQueries({ queryKey: qk.case(caseId) }) : Promise.resolve(),
    ]);
  };
}

export const useCases = (filters: CaseFilters = {}) =>
  useQuery({ queryKey: qk.cases(filters), queryFn: () => cases.listCases(filters), placeholderData: keepPreviousData });

export const useCase = (id: string | undefined) => useQuery({ queryKey: qk.case(id ?? ''), queryFn: () => cases.getCase(id!), enabled: !!id });

export function useCreateCase() {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (input: NewCase) => cases.createCase(input), onSuccess: () => refresh() });
}

export function useUpdateCase(id: string) {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (patch: Parameters<typeof cases.updateCase>[1]) => cases.updateCase(id, patch), onSuccess: () => refresh(id) });
}

export function useChangeStatus(id: string) {
  const refresh = useRefreshCaseData();
  return useMutation({
    mutationFn: (v: { status: CaseStatus; disposal?: { date: string; result: DisposalResult } }) => cases.changeCaseStatus(id, v.status, v.disposal),
    onSuccess: () => refresh(id),
  });
}

export function useArchiveCase(id: string) {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (archived: boolean) => cases.archiveCase(id, archived), onSuccess: () => refresh(id) });
}

export function useDeleteCase() {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (id: string) => cases.deleteCase(id), onSuccess: () => refresh() });
}

/** A case's eCourts orders. Once they're known, the newest start downloading so they open at once. */
export function useCaseOrders(caseId: string | undefined) {
  const q = useQuery({ queryKey: qk.orders(caseId ?? ''), queryFn: () => cases.listCaseOrders(caseId!), enabled: !!caseId });
  const count = q.data?.length ?? 0;
  useEffect(() => {
    if (caseId && count > 0) warmCaseOrders(caseId);
  }, [caseId, count]);
  return q;
}

/**
 * Opening a case with a CNR checks the court (at most every 6 hours per case): new dates, what
 * happened at past listings, orders, disposal. `running` while it checks.
 */
export function useCourtSyncOnOpen(c: { id: string; cnr?: string } | undefined) {
  const refresh = useRefreshCaseData();
  const qc = useQueryClient();
  const id = c?.id ?? '';
  // A query, so it runs once per case per session window and survives leaving and reopening.
  const q = useQuery({
    queryKey: ['court-sync', id],
    queryFn: async () => {
      const r = await syncCases({ caseIds: [id] });
      const reload = () => Promise.all([refresh(id), qc.invalidateQueries({ queryKey: qk.orders(id) })]);
      if (r.updated) await reload();
      // The court's fresh read lands in the background: look again shortly.
      if (r.refreshing) setTimeout(() => void reload(), FRESH_READ_MS);
      return r;
    },
    enabled: !!id && !!c?.cnr,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  return { running: q.isFetching };
}

/**
 * App start (signed in): the advocate's cases due an update are read from the court in the
 * background; the lists refresh a little later to show what came in.
 */
export function useAutoCourtSync(active: boolean) {
  const refresh = useRefreshCaseData();
  useEffect(() => {
    if (!active || autoSynced) return;
    autoSynced = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    syncCases()
      .then((r) => {
        if (r.queued) timer = setTimeout(() => void refresh(), 45_000);
      })
      .catch(() => (autoSynced = false));
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
let autoSynced = false;

/** Refresh from eCourts: court room, judge, status, new orders and the next listing date. */
export function useRefreshFromEcourts(caseId: string) {
  const refresh = useRefreshCaseData();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: cases.CaseDetail) => cases.refreshFromEcourts(c),
    onSuccess: () => {
      const reload = () => Promise.all([refresh(caseId), qc.invalidateQueries({ queryKey: qk.orders(caseId) })]);
      setTimeout(() => void reload(), FRESH_READ_MS); // the court's fresh read, done in the background
      return reload();
    },
  });
}

/** When the court's fresh read (started in the background by a case update) has usually landed. */
const FRESH_READ_MS = 14_000;

// ---- hearings ----
export const useHearings = (from: string, to: string) => useQuery({ queryKey: qk.hearings(from, to), queryFn: () => hearings.listHearings(from, to), placeholderData: keepPreviousData });

export function useAddHearing(caseId: string) {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (input: hearings.HearingInput) => hearings.addHearing(caseId, input), onSuccess: () => refresh(caseId) });
}

export function useUpdateHearing(caseId: string) {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (v: { id: string; patch: Partial<hearings.HearingInput> }) => hearings.updateHearing(v.id, v.patch), onSuccess: () => refresh(caseId) });
}

export function useDeleteHearing(caseId: string) {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (id: string) => hearings.deleteHearing(id), onSuccess: () => refresh(caseId) });
}

export function useRestoreHearing(caseId: string) {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (h: Parameters<typeof hearings.restoreHearing>[0]) => hearings.restoreHearing(h), onSuccess: () => refresh(caseId) });
}
