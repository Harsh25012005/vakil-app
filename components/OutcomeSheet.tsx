import { HEARING_OUTCOMES, type HearingOutcome } from '@vakil/shared';
import { addWeeks, addMonths } from 'date-fns';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRecordOutcome } from '@/hooks/useCases';
import { errorMessage } from '@/services/api';
import type { HearingRow } from '@/services/hearings';
import { formatLongDate, toISODate, today } from '@/utils/date';
import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ChoiceChip } from '@/components/ui/Chip';
import { DatePicker } from '@/components/ui/DatePicker';
import { OutcomePill, outcomeMap } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { TextArea } from '@/components/ui/TextArea';
import { TextField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';

type Props = {
  hearing: HearingRow | null;
  onClose: () => void;
  /** Called after a successful save, e.g. to offer "mark case disposed". */
  onSaved?: (result: { caseId: string; outcome: HearingOutcome }) => void;
};

const QUICK = [
  { key: '1w', label: '+1 week', get: () => addWeeks(today(), 1) },
  { key: '2w', label: '+2 weeks', get: () => addWeeks(today(), 2) },
  { key: '1m', label: '+1 month', get: () => addMonths(today(), 1) },
] as const;

/** Outcomes that make a next date optional: the case is waiting for an order or is finished (FR-HEAR-03/04). */
const DATE_OPTIONAL: HearingOutcome[] = ['reserved', 'disposed'];

/**
 * SCR-29 Update hearing outcome (90% sheet). The core loop of the app: pick what happened, pick the next date,
 * save. Designed to finish in under 30 s: one tap for the outcome, a smart default date, one tap to save.
 */
export function OutcomeSheet({ hearing, onClose, onSaved }: Props) {
  const toast = useToast();
  const record = useRecordOutcome();
  // Keep showing the last hearing while the sheet animates closed.
  const shown = useRef<HearingRow | null>(null);
  if (hearing) shown.current = hearing;
  const h = shown.current;

  const [outcome, setOutcome] = useState<HearingOutcome | null>(null);
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [purpose, setPurpose] = useState('');
  const [skipDate, setSkipDate] = useState(false);

  // Fresh form for every hearing.
  useEffect(() => {
    if (hearing) {
      setOutcome(null);
      setNotes('');
      setDate(null);
      setPurpose('');
      setSkipDate(false);
    }
  }, [hearing?.id]);

  const pickOutcome = (o: HearingOutcome) => {
    setOutcome(o);
    // Smart default: most hearings are adjourned to a date about two weeks out.
    if (!date && !DATE_OPTIONAL.includes(o)) setDate(toISODate(addWeeks(today(), 2)));
    if (DATE_OPTIONAL.includes(o)) setSkipDate(o === 'disposed');
  };

  const needsDate = !!outcome && !DATE_OPTIONAL.includes(outcome);
  const showDate = !!outcome && outcome !== 'disposed';
  const dateOptional = outcome === 'reserved';
  const useDate = showDate && !(dateOptional && skipDate);
  const canSave = !!outcome && (!needsDate || !!date);

  const save = async () => {
    if (!h || !outcome) return;
    try {
      const res = await record.mutateAsync({
        id: h.id,
        input: { outcome, notes, next: useDate && date ? { date, purpose } : undefined },
      });
      onClose();
      toast.show({
        type: 'success',
        title: 'Outcome saved',
        message: res.next ? `Next date: ${formatLongDate(res.next.date)}` : outcome === 'reserved' ? 'Case marked as reserved for order.' : outcomeMap[outcome].label,
      });
      onSaved?.({ caseId: res.caseId, outcome });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: save });
    }
  };

  return (
    <BottomSheet
      open={!!hearing}
      onClose={onClose}
      title="Update outcome"
      footer={<Button label="Save outcome" onPress={save} disabled={!canSave} loading={record.isPending} fullWidth haptic="light" />}
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-6 px-5 pb-3">
        {h ? (
          <View className="gap-0.5">
            <Text variant="title" numberOfLines={2}>
              {h.case.title}
            </Text>
            <Text variant="body-sm" tone="secondary" numberOfLines={1}>
              {[h.case.court?.name, h.case.caseNumber].filter(Boolean).join(' · ')}
            </Text>
          </View>
        ) : null}

        <View className="gap-3">
          <Text variant="overline" tone="tertiary">
            What happened?
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {HEARING_OUTCOMES.map((o) => (
              <ChoiceChip key={o} label={outcomeMap[o].label} selected={outcome === o} onPress={() => pickOutcome(o)} />
            ))}
          </View>
        </View>

        {showDate ? (
          <View className="gap-3">
            <Text variant="overline" tone="tertiary">
              {dateOptional ? 'Next date (optional)' : 'Next date'}
            </Text>
            {dateOptional ? (
              <View className="flex-row gap-2">
                <ChoiceChip label="Waiting for order" selected={skipDate} onPress={() => setSkipDate(true)} />
                <ChoiceChip label="Set a date" selected={!skipDate} onPress={() => setSkipDate(false)} />
              </View>
            ) : null}
            {useDate ? (
              <>
                <View className="flex-row flex-wrap gap-2">
                  {QUICK.map((q) => {
                    const iso = toISODate(q.get());
                    return <ChoiceChip key={q.key} label={q.label} selected={date === iso} onPress={() => setDate(iso)} />;
                  })}
                </View>
                <DatePicker value={date} onChange={setDate} placeholder="Pick a date" showQuickChips={false} />
                <TextField label="Purpose of next date" value={purpose} onChangeText={setPurpose} placeholder="e.g. Reply by respondent" returnKeyType="done" />
              </>
            ) : null}
          </View>
        ) : null}

        {outcome === 'disposed' ? (
          <Text variant="body-sm" tone="secondary">
            No next date is needed. After saving you can mark the whole case as disposed.
          </Text>
        ) : null}

        {outcome ? (
          <TextArea label="Notes (optional)" value={notes} onChangeText={setNotes} placeholder="What the court said, directions, next steps" maxLength={500} showCounter />
        ) : null}

        {outcome ? (
          <View className="flex-row items-center gap-2">
            <Text variant="caption" tone="tertiary">
              Will be saved as
            </Text>
            <OutcomePill outcome={outcome} />
          </View>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
}
