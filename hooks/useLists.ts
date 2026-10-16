import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as settings from '@/services/settings';
import { qk } from './queryKeys';

/** Courts and case types feed every picker, so they are cached for a long time. */
export const useCourts = (includeHidden = false) =>
  useQuery({ queryKey: [...qk.courts, includeHidden], queryFn: () => settings.listCourts({ includeHidden }), staleTime: 5 * 60_000 });
export const useCaseTypes = (includeHidden = false) =>
  useQuery({ queryKey: [...qk.caseTypes, includeHidden], queryFn: () => settings.listCaseTypes({ includeHidden }), staleTime: 5 * 60_000 });

export function useListMutations() {
  const qc = useQueryClient();
  const done = () => Promise.all([qc.invalidateQueries({ queryKey: qk.courts }), qc.invalidateQueries({ queryKey: qk.caseTypes })]);
  return {
    addCourt: useMutation({ mutationFn: (name: string) => settings.addCourt(name), onSuccess: done }),
    updateCourt: useMutation({ mutationFn: (v: { id: string; patch: Parameters<typeof settings.updateCourt>[1] }) => settings.updateCourt(v.id, v.patch), onSuccess: done }),
    moveCourt: useMutation({ mutationFn: (v: { id: string; dir: -1 | 1 }) => settings.moveCourt(v.id, v.dir), onSuccess: done }),
    addCaseType: useMutation({ mutationFn: (name: string) => settings.addCaseType(name), onSuccess: done }),
    updateCaseType: useMutation({ mutationFn: (v: { id: string; patch: Parameters<typeof settings.updateCaseType>[1] }) => settings.updateCaseType(v.id, v.patch), onSuccess: done }),
    moveCaseType: useMutation({ mutationFn: (v: { id: string; dir: -1 | 1 }) => settings.moveCaseType(v.id, v.dir), onSuccess: done }),
  };
}
