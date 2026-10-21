import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { errorMessage } from '@/services/api';
import { fetchCaseByCnr, type DirectoryCourt, type EcourtsCase } from '@/services/ecourts';
import { createCase, existingCnrs } from '@/services/cases';
import { courtFromDirectory } from '@/services/settings';
import { emptyCaseForm, formPatchFromEcourts, toNewCase } from '@/utils/caseForm';
import { toISODate, today, todayISO } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { qk } from './queryKeys';
import { useCaseDraft } from './useCaseDraft';
import { useCaseSearch } from './useCaseSearch';
import { useRefreshCaseData } from './useCases';
import { useListMutations } from './useLists';

/**
 * The Add case steps every page shares: open a case from eCourts (fill the form, go to Check and
 * save) or start a manual entry. The court picked on the first page becomes the case's court.
 */
export function useAddCaseFlow() {
  const router = useRouter();
  const toast = useToast();
  const qc = useQueryClient();
  const draft = useCaseDraft();
  const setFetched = useCaseSearch((s) => s.setFetched);
  const { addCourt, addCaseType } = useListMutations();
  const refreshCases = useRefreshCaseData();
  /** CNR being opened (spinner on that result). */
  const [opening, setOpening] = useState<string | null>(null);

  /** The advocate's own court for the picked directory court (linked, or added). */
  const linkCourt = async (court: DirectoryCourt) => {
    const c = await courtFromDirectory(court);
    void qc.invalidateQueries({ queryKey: qk.courts });
    return c.id;
  };

  const fill = async (d: EcourtsCase) => {
    const court = useCaseDraft.getState().lastDirectoryCourt;
    const base = emptyCaseForm({ caseTypeId: draft.lastCaseTypeId, filingDate: toISODate(today()) });
    const patch = formPatchFromEcourts(d, base, todayISO());
    const courtName = [d.courtName, d.district].filter(Boolean).join(', ');
    const [courtId, caseTypeId] = await Promise.all([
      court ? linkCourt(court) : courtName ? addCourt.mutateAsync(courtName).then((c) => c.id) : Promise.resolve(base.courtId),
      d.caseType ? addCaseType.mutateAsync(d.caseType).then((t) => t.id) : Promise.resolve(base.caseTypeId),
    ]);
    // A new case keeps the clients already picked in this draft (often the same client, many cases).
    draft.set({ ...base, ...patch, courtId, caseTypeId, clientIds: useCaseDraft.getState().values.clientIds });
    setFetched(d);
  };

  /** Fetches the case by CNR, fills the form and opens Check and save. Returns false on failure. */
  const openCase = async (cnr: string): Promise<boolean> => {
    setOpening(cnr);
    try {
      const d = await fetchCaseByCnr(cnr);
      await fill(d);
      haptic.success();
      router.push('/case/add/review');
      return true;
    } catch (e) {
      haptic.warning();
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: () => void openCase(cnr) });
      return false;
    } finally {
      setOpening(null);
    }
  };

  /** Check and save with an empty form (case not on eCourts). `court` null: no court from the list. */
  const startManual = async (court: DirectoryCourt | null) => {
    const base = emptyCaseForm({ caseTypeId: draft.lastCaseTypeId, filingDate: toISODate(today()), clientIds: useCaseDraft.getState().values.clientIds });
    try {
      if (court) base.courtId = await linkCourt(court);
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
    draft.set(base);
    setFetched(null);
    router.push('/case/add/review');
  };

  /** Bulk add progress: how many of how many are done. */
  const [adding, setAdding] = useState<{ done: number; total: number } | null>(null);

  /**
   * Adds every picked case straight from eCourts, one after another (each is one eCourts lookup).
   * Cases already in the list are skipped. No client is set; add one from the case later.
   */
  const addMany = async (cnrs: string[]) => {
    const court = useCaseDraft.getState().lastDirectoryCourt;
    const result = { added: 0, skipped: 0, failed: [] as { cnr: string; reason: string }[] };
    setAdding({ done: 0, total: cnrs.length });
    try {
      const courtId = court ? await linkCourt(court) : undefined;
      const have = await existingCnrs(cnrs);
      const fallbackType = draft.lastCaseTypeId || (await addCaseType.mutateAsync('Other')).id;
      for (const [i, cnr] of cnrs.entries()) {
        try {
          if (have.has(cnr)) {
            result.skipped += 1;
            continue;
          }
          const d = await fetchCaseByCnr(cnr);
          const base = emptyCaseForm({ filingDate: toISODate(today()) });
          const values = { ...base, ...formPatchFromEcourts(d, base, todayISO()) };
          const name = [d.courtName, d.district].filter(Boolean).join(', ');
          values.courtId = courtId ?? (name ? (await addCourt.mutateAsync(name)).id : '');
          values.caseTypeId = d.caseType ? (await addCaseType.mutateAsync(d.caseType)).id : fallbackType;
          if (!values.courtId) throw new Error('No court on eCourts for this case.');
          await createCase(toNewCase(values));
          result.added += 1;
        } catch (e) {
          result.failed.push({ cnr, reason: errorMessage(e) });
        } finally {
          setAdding({ done: i + 1, total: cnrs.length });
        }
      }
    } catch (e) {
      result.failed.push({ cnr: '', reason: errorMessage(e) });
    } finally {
      setAdding(null);
      void refreshCases();
    }
    return result;
  };

  return { openCase, startManual, opening, addMany, adding };
}
