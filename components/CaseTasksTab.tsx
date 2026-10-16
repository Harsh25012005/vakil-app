import { IconChecklist, IconTrash } from '@tabler/icons-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorState } from '@/components/ErrorState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { DatePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Pill } from '@/components/ui/Pill';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { useTaskMutations, useTasks } from '@/hooks/useExtras';
import { errorMessage } from '@/services/api';
import { todayISO } from '@/utils/date';
import type { Task } from '@/services/types';
import { relativeDay } from '@/utils/date';
import { haptic } from '@/utils/haptics';

/** SCR-24 Tasks tab: quick add, tick to complete, overdue flagged, delete with Undo (FR-TASK). */
export function CaseTasksTab({ caseId }: { caseId: string }) {
  const toast = useToast();
  const q = useTasks(caseId);
  const m = useTaskMutations();
  const [title, setTitle] = useState('');
  const [due, setDue] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const tasks = q.data ?? [];
  const open = tasks.filter((t) => !t.completedAt);
  const done = tasks.filter((t) => t.completedAt);

  const add = async () => {
    if (!title.trim()) return;
    try {
      await m.add.mutateAsync({ caseId, title, dueDate: due ?? undefined });
      haptic.success();
      setTitle('');
      setDue(null);
      setAdding(false);
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const remove = async (t: Task) => {
    try {
      await m.remove.mutateAsync(t.id);
      toast.show({ type: 'info', message: 'Task deleted', actionLabel: 'Undo', onAction: () => m.restore.mutate(t) });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const row = (t: Task) => {
    const overdue = !t.completedAt && !!t.dueDate && t.dueDate < todayISO();
    return (
      <Card key={t.id} className="flex-row items-center gap-3 py-2 pr-2">
        <PressableScale onPress={() => (haptic.light(), m.toggle.mutate(t.id))} accessibilityRole="checkbox" accessibilityState={{ checked: !!t.completedAt }} accessibilityLabel={t.title} className="min-h-[44px] flex-1 flex-row items-center gap-3">
          <Checkbox checked={!!t.completedAt} decorative />
          <View className="flex-1 gap-1">
            <Text variant="body" tone={t.completedAt ? 'tertiary' : 'default'} className={t.completedAt ? 'line-through' : undefined}>
              {t.title}
            </Text>
            {t.dueDate && !t.completedAt ? <Pill label={`Due ${relativeDay(t.dueDate).toLowerCase()}`} tone={overdue ? 'error' : 'neutral'} size="sm" /> : null}
          </View>
        </PressableScale>
        <IconButton icon={IconTrash} accessibilityLabel={`Delete ${t.title}`} size="sm" onPress={() => remove(t)} />
      </Card>
    );
  };

  if (q.isError && !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <View className="gap-3">
      {adding ? (
        <Card className="gap-4">
          <TextField label="Task" value={title} onChangeText={setTitle} placeholder="e.g. File vakalatnama" autoFocus returnKeyType="done" onSubmitEditing={add} maxLength={120} />
          <DatePicker label="Due date" value={due} onChange={setDue} />
          <View className="flex-row gap-3">
            <Button label="Cancel" variant="ghost" size="md" className="flex-1" fullWidth onPress={() => (setAdding(false), setTitle(''), setDue(null))} />
            <Button label="Add task" size="md" className="flex-1" fullWidth disabled={!title.trim()} loading={m.add.isPending} onPress={add} haptic="light" />
          </View>
        </Card>
      ) : tasks.length > 0 ? (
        <SectionHeader title={`Tasks · ${tasks.length}`} actionLabel="Add" onAction={() => setAdding(true)} first />
      ) : null}

      {q.isLoading ? (
        <SkeletonCard />
      ) : tasks.length === 0 && !adding ? (
        <EmptyState icon={IconChecklist} title="No tasks yet" message="Track things to do for this case, like filings and follow-ups." actionLabel="Add task" onAction={() => setAdding(true)} />
      ) : (
        <>
          {open.map(row)}
          {done.length > 0 ? (
            <View className="gap-3">
              <SectionHeader title={`Completed · ${done.length}`} />
              {done.map(row)}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}
