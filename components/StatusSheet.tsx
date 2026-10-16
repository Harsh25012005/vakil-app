import { DISPOSAL_RESULTS, type DisposalResult } from '@vakil/shared';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useChangeStatus } from '@/hooks/useCases';
import { errorMessage } from '@/services/api';
import type { CaseRow } from '@/services/cases';
import type { CaseStatus } from '@/services/types';
import { toISODate, today } from '@/utils/date';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { ChoiceChip } from '@/components/ui/Chip';
import { DatePicker } from '@/components/ui/DatePicker';
import { RadioGroup } from '@/components/ui/Radio';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';

const STATUSES: { value: CaseStatus; label: string; description: string }[] = [
  { value: 'active', label: 'Active', description: 'Being heard, has upcoming dates' },
  { value: 'reserved', label: 'Reserved for order', description: 'Arguments done, waiting for the order' },
  { value: 'disposed', label: 'Disposed', description: 'Decided. Needs a date and result' },
  { value: 'closed', label: 'Closed', description: 'No further work expected' },
];
const RESULT_LABEL: Record<DisposalResult, string> = { allowed: 'Allowed', dismissed: 'Dismissed', settled: 'Settled', withdrawn: 'Withdrawn', other: 'Other' };

type Props = { caseRow: CaseRow | null; onClose: () => void };

/** SCR-26 Change status. Disposed requires a disposal date and a result (FR-CASE-13). */
export function StatusSheet({ caseRow, onClose }: Props) {
  const toast = useToast();
  const change = useChangeStatus(caseRow?.id ?? '');
  const [status, setStatus] = useState<CaseStatus>('active');
  const [date, setDate] = useState<string | null>(toISODate(today()));
  const [result, setResult] = useState<DisposalResult | null>(null);

  useEffect(() => {
    if (caseRow) {
      setStatus(caseRow.status);
      setDate(caseRow.disposalDate ?? toISODate(today()));
      setResult(caseRow.disposalResult ?? null);
    }
  }, [caseRow?.id]);

  const disposed = status === 'disposed';
  const canSave = !disposed || (!!date && !!result);

  const save = async () => {
    try {
      await change.mutateAsync({ status, disposal: disposed && date && result ? { date, result } : undefined });
      toast.show({ type: 'success', message: `Status changed to ${STATUSES.find((s) => s.value === status)?.label}` });
      onClose();
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: save });
    }
  };

  return (
    <BottomSheet
      open={!!caseRow}
      onClose={onClose}
      title="Change status"
      footer={<Button label="Save status" onPress={save} disabled={!canSave} loading={change.isPending} fullWidth haptic="light" />}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 pb-3">
        <RadioGroup value={status} onChange={setStatus} options={STATUSES} />
        {disposed ? (
          <View className="gap-4">
            <DatePicker label="Disposal date" required value={date} onChange={setDate} showQuickChips={false} />
            <View className="gap-3">
              <Text variant="body-sm" tone="secondary">
                Result *
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {DISPOSAL_RESULTS.map((r) => (
                  <ChoiceChip key={r} label={RESULT_LABEL[r]} selected={result === r} onPress={() => setResult(r)} />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
