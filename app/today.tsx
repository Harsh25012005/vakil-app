import { IconMoodSmile } from '@tabler/icons-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/ErrorState';
import { HearingGroups } from '@/components/HearingGroups';
import { OutcomeSheet } from '@/components/OutcomeSheet';
import { Banner } from '@/components/ui/Banner';
import { EmptyState } from '@/components/ui/EmptyState';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useHearings, useNeedsUpdate } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import type { HearingRow } from '@/services/hearings';
import { toISODate, today } from '@/utils/date';

// SCR-10 Today's hearings: grouped by court, with "Needs update" first
export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const t = toISODate(today());
  const todayQ = useHearings(t, t);
  const needsQ = useNeedsUpdate();
  const [updating, setUpdating] = useState<HearingRow | null>(null);

  const past = useMemo(() => (needsQ.data ?? []).filter((h) => h.date < t), [needsQ.data, t]);
  const rows = todayQ.data ?? [];
  const pending = rows.filter((r) => !r.completedAt).length;
  const loading = todayQ.isLoading || needsQ.isLoading;
  const courts = new Set(rows.map((r) => r.case.courtId)).size;

  return (
    <View className="flex-1 bg-bg">
      <TopAppBar title="Today" onBack={() => router.back()} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={todayQ.isRefetching} onRefresh={() => Promise.all([todayQ.refetch(), needsQ.refetch()])} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        contentContainerClassName="gap-6 px-5 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text variant="h1" accessibilityRole="header">
            Today's hearings
          </Text>
          <Text variant="body" tone="secondary">
            {format(today(), 'EEEE, d MMMM')}
            {rows.length ? ` · ${rows.length} ${rows.length === 1 ? 'hearing' : 'hearings'} in ${courts} ${courts === 1 ? 'court' : 'courts'}` : ''}
          </Text>
        </View>

        {todayQ.isError ? (
          <ErrorState error={todayQ.error} onRetry={() => todayQ.refetch()} />
        ) : loading ? (
          <View className="gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : (
          <>
            {past.length > 0 ? (
              <View className="gap-3">
                <Banner tone="warning" title={`${past.length} earlier ${past.length === 1 ? 'hearing needs' : 'hearings need'} an update`} message="Record what happened so your diary stays correct." />
                <HearingGroups rows={past} onUpdate={setUpdating} />
              </View>
            ) : null}

            {rows.length > 0 ? (
              <View className="gap-1">
                {past.length > 0 ? <SectionHeader title={`Listed today${pending ? ` · ${pending} to update` : ''}`} className="mt-0" first /> : null}
                <HearingGroups rows={rows} onUpdate={setUpdating} />
              </View>
            ) : past.length === 0 ? (
              <EmptyState icon={IconMoodSmile} title="No hearings today" message="Enjoy the clear day, or look ahead." actionLabel="View tomorrow" onAction={() => router.replace('/calendar')} />
            ) : null}
          </>
        )}
      </ScrollView>
      <OutcomeSheet hearing={updating} onClose={() => setUpdating(null)} />
    </View>
  );
}
