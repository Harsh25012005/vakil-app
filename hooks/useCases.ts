import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as cases from '@/services/cases';
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
      qc.invalidateQueries({ queryKey: qk.needsUpdate }),
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

// ---- hearings ----
export const useHearings = (from: string, to: string) => useQuery({ queryKey: qk.hearings(from, to), queryFn: () => hearings.listHearings(from, to), placeholderData: keepPreviousData });
export const useNeedsUpdate = () => useQuery({ queryKey: qk.needsUpdate, queryFn: hearings.listNeedsUpdate });

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

export function useRecordOutcome() {
  const refresh = useRefreshCaseData();
  return useMutation({
    mutationFn: (v: { id: string; input: hearings.OutcomeInput }) => hearings.recordOutcome(v.id, v.input),
    onSuccess: (r) => refresh(r.caseId),
  });
}

export function useRestoreHearing(caseId: string) {
  const refresh = useRefreshCaseData();
  return useMutation({ mutationFn: (h: Parameters<typeof hearings.restoreHearing>[0]) => hearings.restoreHearing(h), onSuccess: () => refresh(caseId) });
}
