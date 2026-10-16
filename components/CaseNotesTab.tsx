import { IconNotes, IconPlus, IconTrash } from '@tabler/icons-react-native';
import { MAX_PINNED_NOTES } from '@vakil/shared';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { ErrorState } from '@/components/ErrorState';
import { NoteCard } from '@/components/NoteCard';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { useNoteMutations, useNotes } from '@/hooks/useExtras';
import { errorMessage } from '@/services/api';
import type { Note } from '@/services/types';

/** SCR-21 Notes tab: pinned first, add / edit in a sheet, delete with Undo (FR-NOTE). */
export function CaseNotesTab({ caseId }: { caseId: string }) {
  const toast = useToast();
  const q = useNotes(caseId);
  const m = useNoteMutations(caseId);
  const notes = q.data ?? [];
  const pinned = notes.filter((n) => n.isPinned).length;

  const [target, setTarget] = useState<Note | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pin, setPin] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (target === null) return;
    const n = target === 'new' ? undefined : target;
    setTitle(n?.title ?? '');
    setBody(n?.body ?? '');
    setPin(n?.isPinned ?? false);
    setError(undefined);
  }, [target]);

  const editing = target !== null && target !== 'new' ? target : undefined;
  const pinFull = !pin && pinned >= MAX_PINNED_NOTES && !editing?.isPinned;

  const save = async () => {
    if (!body.trim()) return setError("A note can't be empty");
    try {
      await m.save.mutateAsync({ id: editing?.id, title, body, isPinned: pin });
      setTarget(null);
      toast.show({ type: 'success', message: editing ? 'Note updated' : 'Note added' });
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const remove = async () => {
    if (!editing) return;
    const copy = editing;
    try {
      await m.remove.mutateAsync(copy.id);
      setTarget(null);
      toast.show({ type: 'info', message: 'Note deleted', actionLabel: 'Undo', onAction: () => m.restore.mutate(copy) });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <View className="gap-3">
      {q.isLoading ? (
        <SkeletonCard />
      ) : notes.length === 0 ? (
        <EmptyState icon={IconNotes} title="No notes yet" message="Jot down instructions, arguments or reminders for this case." actionLabel="Add note" onAction={() => setTarget('new')} />
      ) : (
        <>
          <SectionHeader title={`Notes · ${notes.length}`} actionLabel="Add" onAction={() => setTarget('new')} first />
          {notes.map((n) => <NoteCard key={n.id} title={n.title} body={n.body} pinned={n.isPinned} updatedLabel={`Updated ${formatDistanceToNow(parseISO(n.updatedAt), { addSuffix: true })}`} onPress={() => setTarget(n)} />)}
        </>
      )}

      <BottomSheet
        open={target !== null}
        onClose={() => setTarget(null)}
        title={editing ? 'Edit note' : 'New note'}
        footer={
          <View className="gap-2">
            <Button label="Save note" onPress={save} loading={m.save.isPending} fullWidth haptic="light" />
            {editing ? <Button label="Delete note" variant="ghost" leadingIcon={IconTrash} onPress={remove} fullWidth /> : null}
          </View>
        }
      >
        <View className="gap-5 px-5 pb-3">
          <TextField label="Title" value={title} onChangeText={setTitle} placeholder="Optional" maxLength={80} />
          <TextArea label="Note" required value={body} onChangeText={(t) => (setBody(t), setError(undefined))} error={error} placeholder="Write your note" maxLength={2000} autoFocus={!editing} />
          <Toggle
            label="Pin to top"
            description={pinFull ? `You can pin up to ${MAX_PINNED_NOTES} notes.` : 'Pinned notes stay above the rest.'}
            value={pin}
            disabled={pinFull}
            onValueChange={setPin}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

