import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as x from '@/services/extras';
import { qk } from './queryKeys';
import { refreshReminders } from './useReminders';

export const useNotes = (caseId: string) => useQuery({ queryKey: qk.notes(caseId), queryFn: () => x.listNotes(caseId) });
export const useDocuments = (caseId: string) => useQuery({ queryKey: qk.documents(caseId), queryFn: () => x.listDocuments(caseId) });
export const useTasks = (caseId?: string) => useQuery({ queryKey: qk.tasks(caseId), queryFn: () => x.listTasks({ caseId }) });
export const useNotifications = () => useQuery({ queryKey: qk.notifications, queryFn: x.listNotifications });

export function useNoteMutations(caseId: string) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: qk.notes(caseId) });
  return {
    save: useMutation({ mutationFn: (v: Parameters<typeof x.saveNote>[1]) => x.saveNote(caseId, v), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => x.deleteNote(id), onSuccess: done }),
    restore: useMutation({ mutationFn: (n: Parameters<typeof x.restoreNote>[0]) => x.restoreNote(n), onSuccess: done }),
  };
}

export function useDocumentMutations(caseId: string) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: qk.documents(caseId) });
  return {
    add: useMutation({ mutationFn: (v: Parameters<typeof x.addDocument>[1]) => x.addDocument(caseId, v), onSuccess: done }),
    rename: useMutation({ mutationFn: (v: { id: string; name: string }) => x.renameDocument(v.id, v.name), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => x.deleteDocument(id), onSuccess: done }),
    restore: useMutation({ mutationFn: (d: Parameters<typeof x.restoreDocument>[0]) => x.restoreDocument(d), onSuccess: done }),
  };
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const done = () => {
    refreshReminders(); // task due dates feed the morning reminder
    return qc.invalidateQueries({ queryKey: qk.tasksAll });
  };
  return {
    add: useMutation({ mutationFn: (v: Parameters<typeof x.addTask>[0]) => x.addTask(v), onSuccess: done }),
    toggle: useMutation({ mutationFn: (id: string) => x.toggleTask(id), onSuccess: done }),
    remove: useMutation({ mutationFn: (id: string) => x.deleteTask(id), onSuccess: done }),
    restore: useMutation({ mutationFn: (t: Parameters<typeof x.restoreTask>[0]) => x.restoreTask(t), onSuccess: done }),
  };
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => x.markNotificationsRead(ids),
    onSuccess: () => Promise.all([qc.invalidateQueries({ queryKey: qk.notifications }), qc.invalidateQueries({ queryKey: qk.dashboard })]),
  });
}
