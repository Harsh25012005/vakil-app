import { IconCalendarOff } from '@tabler/icons-react-native';
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/ErrorState';
import { HearingGroups } from '@/components/HearingGroups';
import { Card } from '@/components/ui/Card';
import { CalendarMonth } from '@/components/ui/CalendarMonth';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTabBarInset } from '@/components/ui/TabBar';
import { Text } from '@/components/ui/Text';
import { useHearings } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import { formatLongDate, fromISODate, relativeDay, toISODate, today } from '@/utils/date';

// SCR-31 Calendar: month + SCR-32 day agenda (grouped by court)
export default function CalendarTab() {
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { colors } = useTheme();
  const [month, setMonth] = useState(today());
  const [day, setDay] = useState(toISODate(today()));

  // One fetch per visible month (FR-CAL-01); the selected day is filtered from it.
  const from = toISODate(startOfMonth(month));
  const to = toISODate(endOfMonth(month));
  const q = useHearings(from, to);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const h of q.data ?? []) m[h.date] = (m[h.date] ?? 0) + 1;
    return m;
  }, [q.data]);

  const dayRows = useMemo(() => (q.data ?? []).filter((h) => h.date === day), [q.data, day]);
  const inView = day >= from && day <= to;

  // Picking a day in an adjacent month moves the grid with it.
  const select = (iso: string) => {
    setDay(iso);
    if (iso < from || iso > to) setMonth(fromISODate(iso));
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isLoading} onRefresh={() => q.refetch()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
        contentContainerStyle={{ paddingBottom: tabInset + 8 }}
        contentContainerClassName="gap-5 px-5 pt-3"
      >
        <Text variant="h1" accessibilityRole="header">
          Calendar
        </Text>

        <Card>
          <CalendarMonth month={month} onMonthChange={setMonth} selected={day} onSelect={select} counts={counts} />
        </Card>

        <View className="gap-1">
          <Text variant="title" accessibilityRole="header">
            {formatLongDate(day)}
          </Text>
          <Text variant="body-sm" tone="secondary">
            {relativeDay(day)}
            {inView && !q.isLoading ? ` · ${dayRows.length} ${dayRows.length === 1 ? 'hearing' : 'hearings'}` : ''}
          </Text>
        </View>

        {q.isError && !q.data ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : q.isLoading || !inView ? (
          <View className="gap-3">
            <SkeletonCard />
          </View>
        ) : dayRows.length === 0 ? (
          <EmptyState icon={IconCalendarOff} title="No hearings" message={`Nothing is listed on ${format(fromISODate(day), 'd MMMM')}.`} className="py-6" />
        ) : (
          <HearingGroups rows={dayRows} />
        )}
      </ScrollView>
    </View>
  );
}
