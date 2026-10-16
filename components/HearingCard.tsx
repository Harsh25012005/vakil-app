import { IconAlertTriangle, IconCircleCheck, IconHistory, IconStairsUp } from '@tabler/icons-react-native';
import type { HearingOutcome } from '@vakil/shared';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { InfoTag } from '@/components/ui/InfoTag';
import { Pill } from '@/components/ui/Pill';
import { OutcomePill, outcomeMap } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils/date';

export type HearingCardProps = {
  caseTitle: string;
  caseNumber?: string;
  /** 24h "HH:mm". */
  time?: string;
  courtRoom?: string;
  stage?: string;
  lastOutcome?: HearingOutcome;
  state: 'upcoming' | 'needs-update' | 'done';
  /** Outcome recorded today (state = done). */
  outcome?: HearingOutcome;
  onPress?: () => void;
  onUpdate?: () => void;
};

/** CMP-40. Today list + calendar day. "Update" opens the outcome sheet (FR-HEAR-02). */
export function HearingCard({ caseTitle, caseNumber, time, courtRoom, stage, lastOutcome, state, outcome, onPress, onUpdate }: HearingCardProps) {
  const needsUpdate = state === 'needs-update';
  return (
    <Card onPress={onPress} accessibilityLabel={`${caseTitle}${time ? ` at ${formatTime(time)}` : ''}`} containsActions={state !== 'done' && !!onUpdate} className={cn(needsUpdate && 'border-warning/50')}>
      <View className="flex-row items-center gap-2">
        <Text variant="title" tone="primary" tabular>
          {time ? formatTime(time) : 'Time not set'}
        </Text>
        {courtRoom ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1} className="flex-1">
            {`· Room ${courtRoom}`}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        {needsUpdate ? <Pill label="Needs update" tone="warning" size="sm" icon={IconAlertTriangle} /> : null}
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

      {stage || lastOutcome ? (
        <View className="mt-3 gap-1.5">
          {stage ? <InfoTag icon={IconStairsUp} label={stage} /> : null}
          {lastOutcome ? <InfoTag icon={IconHistory} label={`Last: ${outcomeMap[lastOutcome].label}`} tone="tertiary" /> : null}
        </View>
      ) : null}

      {state !== 'done' && onUpdate ? (
        <Button className="mt-4" label="Update outcome" variant={needsUpdate ? 'primary' : 'secondary'} size="md" leadingIcon={IconCircleCheck} onPress={onUpdate} fullWidth />
      ) : null}
    </Card>
  );
}
