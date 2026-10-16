import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useCaseTypes, useCourts } from '@/hooks/useLists';
import { useClients } from '@/hooks/useClients';
import type { CaseFilters } from '@/services/types';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { DatePicker } from '@/components/ui/DatePicker';
import { Select } from '@/components/ui/Select';
import { Text } from '@/components/ui/Text';
import { ChoiceChip } from '@/components/ui/Chip';

export type CaseFilterValues = Pick<CaseFilters, 'caseTypeId' | 'courtId' | 'clientId' | 'from' | 'to'>;

export const countActiveFilters = (f: CaseFilterValues) =>
  [f.caseTypeId, f.courtId, f.clientId].filter(Boolean).length + (f.from || f.to ? 1 : 0);

type Props = {
  open: boolean;
  values: CaseFilterValues;
  /** Live result count for the "Show N cases" button. */
  resultCount?: number;
  onApply: (v: CaseFilterValues) => void;
  onClose: () => void;
};

/** SCR-12 Case filters. Filters combine with AND; the button shows how many cases will match. */
export function CaseFiltersSheet({ open, values, onApply, onClose, resultCount }: Props) {
  const [draft, setDraft] = useState<CaseFilterValues>(values);
  const courts = useCourts();
  const types = useCaseTypes();
  const clients = useClients();

  useEffect(() => {
    if (open) setDraft(values);
  }, [open, values]);

  const opt = <T extends { id: string }>(list: T[] | undefined, label: (t: T) => string) => [{ value: '', label: 'Any' }, ...(list ?? []).map((t) => ({ value: t.id, label: label(t) }))];
  const set = (patch: Partial<CaseFilterValues>) => setDraft((d) => ({ ...d, ...patch }));
  const n = countActiveFilters(draft);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Filters"
      footer={
        <View className="flex-row gap-3">
          <Button label="Clear all" variant="outline" onPress={() => setDraft({})} disabled={n === 0} className="flex-1" fullWidth />
          <Button label="Apply" onPress={() => (onApply(draft), onClose())} className="flex-[1.4]" fullWidth haptic="light" />
        </View>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-5 pb-3">
        <Select label="Case type" value={draft.caseTypeId ?? ''} onChange={(v) => set({ caseTypeId: v || undefined })} options={opt(types.data, (t) => t.name)} />
        <Select label="Court" value={draft.courtId ?? ''} onChange={(v) => set({ courtId: v || undefined })} options={opt(courts.data, (c) => c.name)} />
        <Select label="Client" value={draft.clientId ?? ''} onChange={(v) => set({ clientId: v || undefined })} options={opt(clients.data, (c) => c.fullName)} />
        <View className="gap-2">
          <Text variant="body-sm" tone="secondary">
            Next hearing between
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <DatePicker value={draft.from ?? null} onChange={(v) => set({ from: v })} showQuickChips={false} placeholder="From" />
            </View>
            <View className="flex-1">
              <DatePicker value={draft.to ?? null} onChange={(v) => set({ to: v })} showQuickChips={false} placeholder="To" />
            </View>
          </View>
          {draft.from || draft.to ? <ChoiceChip label="Clear dates" selected={false} onPress={() => set({ from: undefined, to: undefined })} /> : null}
        </View>
        {resultCount !== undefined ? (
          <Text variant="caption" tone="tertiary">{`${resultCount} ${resultCount === 1 ? 'case matches' : 'cases match'} your current view.`}</Text>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
