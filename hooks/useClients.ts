import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as clients from '@/services/clients';
import { qk } from './queryKeys';

export const useClients = (q?: string) => useQuery({ queryKey: qk.clients(q), queryFn: () => clients.listClients(q), placeholderData: keepPreviousData });
export const useClient = (id: string | undefined) => useQuery({ queryKey: qk.client(id ?? ''), queryFn: () => clients.getClient(id!), enabled: !!id });

function useRefreshClients() {
  const qc = useQueryClient();
  return (id?: string) => Promise.all([qc.invalidateQueries({ queryKey: qk.clientsAll }), qc.invalidateQueries({ queryKey: qk.casesAll }), id ? qc.invalidateQueries({ queryKey: qk.client(id) }) : undefined]);
}

export function useCreateClient() {
  const refresh = useRefreshClients();
  return useMutation({ mutationFn: (input: clients.ClientInput) => clients.createClient(input), onSuccess: () => refresh() });
}

export function useUpdateClient(id: string) {
  const refresh = useRefreshClients();
  return useMutation({ mutationFn: (patch: Partial<clients.ClientInput>) => clients.updateClient(id, patch), onSuccess: () => refresh(id) });
}

export function useDeleteClient() {
  const refresh = useRefreshClients();
  return useMutation({ mutationFn: (id: string) => clients.deleteClient(id), onSuccess: () => refresh() });
}
