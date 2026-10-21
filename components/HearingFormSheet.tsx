import { IconTrash } from '@tabler/icons-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { TextArea } from '@/components/ui/TextArea';
import { useAddHearing, useDeleteHearing, useRestoreHearing, useUpdateHearing } from '@/hooks/useCases';
import { errorMessage } from '@/services/api';
import type { Hearing } from '@/services/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { TextField } from '@/components/ui/TextField';
import { TimePicker } from '@/components/ui/TimePicker';
import { useToast } from '@/components/ui/Toast';

type Props = {
  caseId: string;
  /** null = closed, 'new' = add, a Hearing = edit. */
  target: Hearing | 'new' | null;
  defaultRoom?: string;
  onClose: () => void;
};

/** SCR-30 Add / edit hearing. Deleting a hearing is immediate with a 5 s Undo (FRS 9.3). */
export function HearingFormSheet({ caseId, target, defaultRoom, onClose }: Props) {
  const toast = useToast();
  const add = useAddHearing(caseId);
  const update = useUpdateHearing(caseId);
  const remove = useDeleteHearing(caseId);
  const restore = useRestoreHearing(caseId);

  const editing = target && target !== 'new' ? target : null;
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [room, setRoom] = useState('');
  const [item, setItem] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!target) return;
    setDate(editing?.date ?? null);
    setTime(editing?.time ?? null);
    setPurpose(editing?.purpose ?? '');
    setRoom(editing?.courtRoom ?? defaultRoom ?? '');
    setItem(editing?.itemNumber ?? '');
    setNotes(editing?.outcomeNotes ?? '');
    setError(undefined);
  }, [target]);

  const save = async () => {
    if (!date) {
      setError('Pick a date');
      return;
    }
    const input = { date, time: time ?? undefined, purpose: purpose.trim() || undefined, courtRoom: room.trim() || undefined, itemNumber: item.trim() || undefined, outcomeNotes: notes.trim() || undefined };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, patch: input });
      else await add.mutateAsync(input);
      toast.show({ type: 'success', message: editing ? 'Hearing updated' : 'Hearing added' });
      onClose();
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: save });
    }
  };

  const del = async () => {
    if (!editing) return;
    const snapshot = editing;
    try {
      await remove.mutateAsync(snapshot.id);
      onClose();
      toast.show({ message: 'Hearing deleted', actionLabel: 'Undo', onAction: () => void restore.mutateAsync(snapshot) });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  return (
    <BottomSheet
      open={!!target}
      onClose={onClose}
      title={editing ? 'Edit hearing' : 'Add hearing'}
      footer={<Button label={editing ? 'Save changes' : 'Add hearing'} onPress={save} loading={add.isPending || update.isPending} fullWidth haptic="light" />}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-5 pb-3">
        <DatePicker label="Date" required value={date} onChange={(d) => (setDate(d), setError(undefined))} error={error} warnIfPast />
        <TimePicker label="Time" value={time} onChange={setTime} helper="Optional. Shown on your agenda." />
        <TextField label="Purpose" value={purpose} onChangeText={setPurpose} placeholder="e.g. Arguments, evidence" returnKeyType="next" />
        <TextField label="Court room / hall" value={room} onChangeText={setRoom} placeholder="e.g. 12" returnKeyType="next" />
        <TextField label="Item no. on cause list" value={item} onChangeText={(v) => setItem(v.slice(0, 20))} placeholder="e.g. 34" helper="Optional. Shown in Today's hearings and its PDF." returnKeyType="next" />
        {editing?.courtBusiness ? (
          <View className="gap-1 rounded-lg bg-surface px-3 py-2.5">
            <Text variant="caption" tone="tertiary">
              Recorded by the court on eCourts
            </Text>
            <Text variant="body-sm" tone="secondary">
              {editing.courtBusiness}
            </Text>
          </View>
        ) : null}
        <TextArea label="Description" value={notes} onChangeText={setNotes} placeholder="What happened, what the judge said, what to prepare next" maxLength={2000} helper="Optional. Shown under this hearing." />
        {editing ? <Button label="Delete hearing" variant="destructive-ghost" leadingIcon={IconTrash} onPress={del} loading={remove.isPending} fullWidth haptic="warning" /> : null}
      </ScrollView>
    </BottomSheet>
  );
}
