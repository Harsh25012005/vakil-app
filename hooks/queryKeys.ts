import type { CaseFilters } from '@/services/types';

/** One place for every cache key, so invalidation after a mutation can never miss a screen. */
export const qk = {
  cases: (f?: CaseFilters) => ['cases', f ?? {}] as const,
  casesAll: ['cases'] as const,
  case: (id: string) => ['case', id] as const,
  hearings: (from: string, to: string) => ['hearings', from, to] as const,
  hearingsAll: ['hearings'] as const,
  clients: (q?: string) => ['clients', q ?? ''] as const,
  clientsAll: ['clients'] as const,
  client: (id: string) => ['client', id] as const,
  dashboard: ['dashboard'] as const,
  courts: ['courts'] as const,
  caseTypes: ['case-types'] as const,
  notes: (caseId: string) => ['notes', caseId] as const,
  documents: (caseId: string) => ['documents', caseId] as const,
  orders: (caseId: string) => ['orders', caseId] as const,
  courtDirectory: (q: string) => ['court-directory', q] as const,
  tasks: (caseId?: string) => ['tasks', caseId ?? 'all'] as const,
  tasksAll: ['tasks'] as const,
  notifications: ['notifications'] as const,
  search: (q: string) => ['search', q] as const,
};
