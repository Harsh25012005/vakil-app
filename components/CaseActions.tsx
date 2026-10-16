import { IconArchive, IconArchiveOff, IconEdit, IconGavel, IconShare, IconTrash } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share } from 'react-native';
import { useArchiveCase, useDeleteCase } from '@/hooks/useCases';
import { errorMessage } from '@/services/api';
import { caseSummaryText, type CaseRow } from '@/services/cases';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { StatusSheet } from './StatusSheet';

/**
 * SCR-27 Case actions menu + its follow-ups: change status (SCR-26), archive with Undo, share summary,
 * and the type-to-confirm delete dialog (SCR-28). Returns an `open(case)` and the `sheets` to render once.
 */
export function useCaseActions(opts: { onDeleted?: () => void } = {}) {
  const router = useRouter();
  const toast = useToast();
  const [target, setTarget] = useState<CaseRow | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusFor, setStatusFor] = useState<CaseRow | null>(null);
  const [deleting, setDeleting] = useState<CaseRow | null>(null);

  const archive = useArchiveCase(target?.id ?? '');
  const remove = useDeleteCase();

  const open = useCallback((c: CaseRow) => {
    setTarget(c);
    setMenuOpen(true);
  }, []);

  const doArchive = async (c: CaseRow) => {
    const archiving = !c.archivedAt;
    try {
      await archive.mutateAsync(archiving);
      toast.show({
        message: archiving ? 'Case archived' : 'Case restored',
        actionLabel: 'Undo',
        // FRS 9.3: archive is reversible, so it uses a 5 s Undo instead of a confirmation.
        onAction: () => void archive.mutateAsync(!archiving),
      });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await remove.mutateAsync(deleting.id);
      setDeleting(null);
      toast.show({ type: 'success', message: 'Case deleted' });
      opts.onDeleted?.();
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const c = target;
  const sheets = (
    <>
      <ActionSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={c?.title}
        actions={
          c
            ? [
                { key: 'edit', label: 'Edit case', icon: IconEdit, onPress: () => router.push({ pathname: '/case/edit', params: { id: c.id } }) },
                { key: 'status', label: 'Change status', icon: IconGavel, onPress: () => setStatusFor(c) },
                { key: 'share', label: 'Share summary', icon: IconShare, onPress: () => void Share.share({ message: caseSummaryText(c) }) },
                { key: 'archive', label: c.archivedAt ? 'Restore from archive' : 'Archive', icon: c.archivedAt ? IconArchiveOff : IconArchive, onPress: () => void doArchive(c) },
                { key: 'delete', label: 'Delete case', icon: IconTrash, destructive: true, onPress: () => setDeleting(c) },
              ]
            : []
        }
      />
      <StatusSheet caseRow={statusFor} onClose={() => setStatusFor(null)} />
      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        variant="destructive"
        title="Delete this case?"
        message="Its hearings, notes, documents, fees and tasks are removed with it. This cannot be undone."
        confirmText="DELETE"
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );

  return { open, sheets };
}
