import { create } from 'zustand';
import type { CaseSearchInput, CaseSearchResult, EcourtsCase } from '@/services/ecourts';

type CaseSearch = {
  /** The last eCourts search (results page) and its pages so far. */
  query: CaseSearchInput | null;
  results: CaseSearchResult[];
  total: number;
  page: number;
  hasMore: boolean;
  /** The search looked across the whole state because the district had no match. */
  widened: boolean;
  /** The case picked on eCourts, shown on Check and save. Null for manual entry. */
  fetched: EcourtsCase | null;
  setResults: (query: CaseSearchInput, r: { results: CaseSearchResult[]; total: number; page: number; hasNextPage: boolean; widened?: boolean }, append?: boolean) => void;
  setFetched: (c: EcourtsCase | null) => void;
  clear: () => void;
};

/** Add case pages (search form -> results -> check and save) share the search here, in memory only. */
export const useCaseSearch = create<CaseSearch>()((set) => ({
  query: null,
  results: [],
  total: 0,
  page: 1,
  hasMore: false,
  widened: false,
  fetched: null,
  setResults: (query, r, append = false) =>
    set((s) => ({
      query,
      results: append ? [...s.results, ...r.results] : r.results,
      total: r.total,
      page: r.page,
      hasMore: r.hasNextPage,
      widened: !!r.widened,
    })),
  setFetched: (fetched) => set({ fetched }),
  clear: () => set({ query: null, results: [], total: 0, page: 1, hasMore: false, widened: false, fetched: null }),
}));
