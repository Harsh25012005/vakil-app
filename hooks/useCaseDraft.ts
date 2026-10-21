import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { DirectoryCourt, SearchMode } from '@/services/ecourts';
import { emptyCaseForm, type CaseFormValues } from '@/utils/caseForm';

type Draft = {
  values: CaseFormValues;
  /** 0 = find the case on eCourts, 1 = review and save. */
  step: number;
  /** Remembered between cases so adding the next one is faster (PRD risk: "manual entry feels slow"). */
  lastCourtId: string;
  lastCaseTypeId: string;
  /** The court picked in the court search and how the last case was found there. */
  lastDirectoryCourt: DirectoryCourt | null;
  lastMode: SearchMode;
  /** Courts picked recently, newest first (court search shortcuts). */
  recentCourts: DirectoryCourt[];
  set: (patch: Partial<CaseFormValues>) => void;
  setStep: (n: number) => void;
  /** Fresh form seeded with the remembered court and case type. */
  reset: (keepCourtAndType?: boolean) => void;
  remember: (v: CaseFormValues) => void;
  pickCourt: (c: DirectoryCourt | null) => void;
  setMode: (m: SearchMode) => void;
  isDirty: () => boolean;
};

/** FR-CASE-01: the draft auto-saves on every change and survives closing the app. */
export const useCaseDraft = create<Draft>()(
  persist(
    (set, get) => ({
      values: emptyCaseForm(),
      step: 0,
      lastCourtId: '',
      lastCaseTypeId: '',
      lastDirectoryCourt: null,
      lastMode: 'cnr',
      recentCourts: [],
      set: (patch) => set((s) => ({ values: { ...s.values, ...patch } })),
      setStep: (step) => set({ step }),
      reset: (keep = true) =>
        set((s) => ({
          step: 0,
          values: emptyCaseForm(keep ? { courtId: s.lastCourtId, caseTypeId: s.lastCaseTypeId } : {}),
        })),
      remember: (v) => set({ lastCourtId: v.courtId, lastCaseTypeId: v.caseTypeId }),
      pickCourt: (c) =>
        set((s) => ({
          lastDirectoryCourt: c,
          recentCourts: c ? [c, ...s.recentCourts.filter((r) => r.id !== c.id)].slice(0, 6) : s.recentCourts,
        })),
      setMode: (lastMode) => set({ lastMode }),
      isDirty: () => {
        const { values: v } = get();
        return !!(v.title || v.caseNumber || v.cnr || v.petitioner || v.respondent || v.clientIds.length || v.courtRoom || v.judge || v.nextHearingDate || v.stage);
      },
    }),
    {
      name: 'vakil.case-draft.v1',
      storage: createJSONStorage(() => AsyncStorage),
      // Drafts saved before a field existed get its empty value.
      merge: (saved, current) => {
        const s = (saved ?? {}) as Partial<Draft>;
        return { ...current, ...s, values: { ...emptyCaseForm(), ...(s.values ?? {}) } };
      },
    },
  ),
);
