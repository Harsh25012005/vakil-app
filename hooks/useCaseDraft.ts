import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { emptyCaseForm, type CaseFormValues } from '@/utils/caseForm';

type Draft = {
  values: CaseFormValues;
  step: number;
  /** Remembered between cases so adding the next one is faster (PRD risk: "manual entry feels slow"). */
  lastCourtId: string;
  lastCaseTypeId: string;
  set: (patch: Partial<CaseFormValues>) => void;
  setStep: (n: number) => void;
  /** Fresh form seeded with the remembered court and case type. */
  reset: (keepCourtAndType?: boolean) => void;
  remember: (v: CaseFormValues) => void;
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
      set: (patch) => set((s) => ({ values: { ...s.values, ...patch } })),
      setStep: (step) => set({ step }),
      reset: (keep = true) =>
        set((s) => ({
          step: 0,
          values: emptyCaseForm(keep ? { courtId: s.lastCourtId, caseTypeId: s.lastCaseTypeId } : {}),
        })),
      remember: (v) => set({ lastCourtId: v.courtId, lastCaseTypeId: v.caseTypeId }),
      isDirty: () => {
        const { values: v } = get();
        return !!(v.title || v.caseNumber || v.cnr || v.petitioner || v.respondent || v.clientIds.length || v.courtRoom || v.judge || v.nextHearingDate || v.stage);
      },
    }),
    { name: 'vakil.case-draft.v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
