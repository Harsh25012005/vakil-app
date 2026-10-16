import { useQuery } from '@tanstack/react-query';
import { getDashboard, searchAll } from '@/services/dashboard';
import { qk } from './queryKeys';

export const useDashboard = () => useQuery({ queryKey: qk.dashboard, queryFn: getDashboard });
export const useSearch = (q: string) => useQuery({ queryKey: qk.search(q), queryFn: () => searchAll(q), enabled: q.trim().length > 0 });
