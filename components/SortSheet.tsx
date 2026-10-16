import { BottomSheet } from '@/components/ui/BottomSheet';
import { RadioGroup } from '@/components/ui/Radio';
import type { CaseFilters } from '@/services/types';
import { View } from 'react-native';

export type SortKey = NonNullable<CaseFilters['sort']>;

export const SORT_OPTIONS: { value: SortKey; label: string; description?: string }[] = [
  { value: 'next_date', label: 'Next hearing date', description: 'Overdue cases first' },
  { value: 'recent', label: 'Recently added' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'title', label: 'Title A to Z' },
];

/** SCR-13 Sort options. The choice is persisted per device (FR-CASE-10). */
export function SortSheet({ open, value, onChange, onClose }: { open: boolean; value: SortKey; onChange: (v: SortKey) => void; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="Sort cases by">
      <View className="px-5 pb-2">
        <RadioGroup
          value={value}
          options={SORT_OPTIONS}
          onChange={(v) => {
            onChange(v);
            onClose();
          }}
        />
      </View>
    </BottomSheet>
  );
}
