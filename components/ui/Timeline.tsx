import type { HearingOutcome } from '@vakil/shared';
import { useEffect, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { cn } from '@/utils/cn';
import { formatShortDate, formatTime, toISODate, type ISODate } from '@/utils/date';
import { status } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { PressableScale } from '@/components/ui/PressableScale';
import { OutcomePill, outcomeMap } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';

export type TimelineItem = {
  id: string;
  date: ISODate;
  time?: string;
  purpose?: string;
  outcome?: HearingOutcome;
  notes?: string;
  /** What happened that day, as the court recorded it (eCourts business of the day). */
  description?: string;
  /** Shown under the row, outside its press target (e.g. that day's order documents). */
  footer?: ReactNode;
  onPress?: () => void;
};

type Phase = 'future' | 'today' | 'past';

function Node({ phase, outcome }: { phase: Phase; outcome?: HearingOutcome }) {
  const { colors, scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (phase === 'today' && !reduceMotion) pulse.value = withTiming(1, { duration: 900 });
  }, [phase, reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 1.4 }],
  }));

  const tone = outcome ? outcomeMap[outcome].tone : 'neutral';
  const fill =
    phase === 'today'
      ? status.warning.base
      : tone === 'primary'
        ? colors.primary
        : tone === 'neutral'
          ? colors.borderStrong
          : status[tone].base;

  if (phase === 'future') {
    return <View className="h-3 w-3 rounded-full border-2 border-border-strong bg-bg" />;
  }
  return (
    <View className="h-3 w-3 items-center justify-center">
      {phase === 'today' ? (
        <Animated.View style={[{ position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: fill }, pulseStyle]} />
      ) : null}
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: fill, borderWidth: 2, borderColor: scheme === 'dark' ? colors.bg : colors.surface }} />
    </View>
  );
}

function Row({ item, phase, last }: { item: TimelineItem; phase: Phase; last: boolean }) {
  const body = (
    <View className="gap-1.5">
      <View className="flex-row items-center gap-2">
        <Text variant="title" tabular tone={phase === 'future' ? 'secondary' : 'default'}>
          {formatShortDate(item.date)}
        </Text>
        {item.time ? (
          <Text variant="caption" tone="tertiary" tabular>
            {formatTime(item.time)}
          </Text>
        ) : null}
      </View>
      {item.purpose ? (
        <Text variant="body-sm" tone="secondary">
          {item.purpose}
        </Text>
      ) : null}
      {item.outcome ? <OutcomePill outcome={item.outcome} /> : null}
      {item.description ? (
        <Text variant="body-sm" tone="secondary" numberOfLines={4}>
          <Text variant="body-sm" tone="tertiary">
            {'Court: '}
          </Text>
          {item.description}
        </Text>
      ) : null}
      {item.notes ? (
        <Text variant="body-sm" tone="secondary" numberOfLines={4}>
          <Text variant="body-sm" tone="tertiary">
            {'Notes: '}
          </Text>
          {item.notes}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View className="flex-row gap-3">
      <View className="w-3 items-center pt-1.5">
        <Node phase={phase} outcome={item.outcome} />
        {!last ? <View className={cn('mt-1 w-0.5 flex-1 rounded-full', phase === 'future' ? 'bg-border' : 'bg-border-strong')} /> : null}
      </View>
      <View className="flex-1 gap-2 pb-6">
        {item.onPress ? (
          <PressableScale onPress={item.onPress} accessibilityRole="button">
            {body}
          </PressableScale>
        ) : (
          body
        )}
        {item.footer}
      </View>
    </View>
  );
}

/** CMP-31. Newest on top; future hearings sit above the "Today" marker (FR-HEAR-06). */
export function Timeline({ items, today = toISODate(new Date()) }: { items: TimelineItem[]; today?: ISODate }) {
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));
  const future = sorted.filter((i) => i.date > today);
  const rest = sorted.filter((i) => i.date <= today);

  return (
    <View>
      {future.map((item) => (
        <Row key={item.id} item={item} phase="future" last={false} />
      ))}
      <View className="mb-4 flex-row items-center gap-2" accessibilityRole="header">
        <View className="h-3 w-3 items-center justify-center">
          <View className="h-1.5 w-1.5 rounded-full bg-primary" />
        </View>
        <Text variant="overline" tone="primary">
          Today
        </Text>
        <View className="h-px flex-1 bg-primary/40" />
      </View>
      {rest.map((item, i) => (
        <Row key={item.id} item={item} phase={item.date === today ? 'today' : 'past'} last={i === rest.length - 1} />
      ))}
    </View>
  );
}
