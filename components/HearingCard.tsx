import { IconGavel, IconHistory, IconStairsUp } from '@tabler/icons-react-native';
import type { HearingOutcome } from '@vakil/shared';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { InfoTag } from '@/components/ui/InfoTag';
import { OutcomePill, outcomeMap } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { formatTime } from '@/utils/date';

export type HearingCardProps = {
  caseTitle: string;
  caseNumber?: string;
  /** 24h "HH:mm". */
  time?: string;
  courtRoom?: string;
  /** Item number on the day's cause list. */
  itemNumber?: string;
  judge?: string;
  stage?: string;
  lastOutcome?: HearingOutcome;
  state: 'upcoming' | 'done';
  /** What happened, from the court (state = done). */
  outcome?: HearingOutcome;
  onPress?: () => void;
};

/** CMP-40. Today list + calendar day. Outcomes come from the court; nothing to record here. */
export function HearingCard({ caseTitle, caseNumber, time, courtRoom, itemNumber, judge, stage, lastOutcome, state, outcome, onPress }: HearingCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${caseTitle}${time ? ` at ${formatTime(time)}` : ''}`}>
      <View className="flex-row items-center gap-2">
        <Text variant="title" tone="primary" tabular>
          {time ? formatTime(time) : 'Time not set'}
        </Text>
        {courtRoom || itemNumber ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1} className="flex-1">
            {[courtRoom && `· Room ${courtRoom}`, itemNumber && `· Item ${itemNumber}`].filter(Boolean).join(' ')}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        {state === 'done' && outcome ? <OutcomePill outcome={outcome} /> : null}
      </View>

      <Text variant="body-lg" className="mt-2 font-sans-semibold" numberOfLines={2}>
        {caseTitle}
      </Text>
      {caseNumber ? (
        <Text variant="caption" tone="tertiary" tabular>
          {caseNumber}
        </Text>
      ) : null}

      {stage || lastOutcome || judge ? (
        <View className="mt-3 gap-1.5">
          {judge ? <InfoTag icon={IconGavel} label={judge} /> : null}
          {stage ? <InfoTag icon={IconStairsUp} label={stage} /> : null}
          {lastOutcome ? <InfoTag icon={IconHistory} label={`Last: ${outcomeMap[lastOutcome].label}`} tone="tertiary" /> : null}
        </View>
      ) : null}
    </Card>
  );
}
