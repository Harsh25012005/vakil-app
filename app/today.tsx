import { IconMoodSmile } from '@tabler/icons-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { TodayPdfButton } from '@/components/TodayPdfButton';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/ErrorState';
import { HearingGroups } from '@/components/HearingGroups';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useHearings } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import { toISODate, today } from '@/utils/date';

// SCR-10 Today's hearings: grouped by court. What happened at each comes in from the court by
// itself (eCourts), so there is nothing to record here.
export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const t = toISODate(today());
  const todayQ = useHearings(t, t);

  const rows = todayQ.data ?? [];
  const loading = todayQ.isLoading;
  const courts = new Set(rows.map((r) => r.case.courtId)).size;

  return (
    <View className="flex-1 bg-bg">
      <TopAppBar title="Today" onBack={() => router.back()} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={todayQ.isRefetching} onRefresh={() => todayQ.refetch()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        contentContainerClassName="gap-6 px-5 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text variant="h1" accessibilityRole="header">
            {"Today's hearings"}
          </Text>
          <Text variant="body" tone="secondary">
            {format(today(), 'EEEE, d MMMM')}
            {rows.length ? ` · ${rows.length} ${rows.length === 1 ? 'hearing' : 'hearings'} in ${courts} ${courts === 1 ? 'court' : 'courts'}` : ''}
          </Text>
          {!loading && !todayQ.isError ? <TodayPdfButton rows={rows} date={t} fullWidth className="mt-3" /> : null}
        </View>

        {todayQ.isError ? (
          <ErrorState error={todayQ.error} onRetry={() => todayQ.refetch()} />
        ) : loading ? (
          <View className="gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : rows.length > 0 ? (
          <HearingGroups rows={rows} />
        ) : (
          <EmptyState icon={IconMoodSmile} title="No hearings today" message="Enjoy the clear day, or look ahead." actionLabel="View tomorrow" onAction={() => router.replace('/calendar')} />
        )}
      </ScrollView>
    </View>
  );
}
