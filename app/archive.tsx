import { IconArchive } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaseCard } from '@/components/CaseCard';
import { useCaseActions } from '@/components/CaseActions';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useCases } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import { caseStatusKind } from '@/utils/caseStatus';

// Archive: cases moved out of the main list. Tap to open, long-press to restore or delete.
const FILTERS = { archived: true, status: 'all', sort: 'updated' } as const;

export default function Archive() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const q = useCases(FILTERS);
  const actions = useCaseActions();
  const list = q.data ?? [];

  return (
    <View className="flex-1 bg-bg">
      <TopAppBar title="" onBack={() => (router.canGoBack() ? router.back() : router.replace('/more'))} />
      <View className="gap-1 px-5 pb-3">
        <Text variant="h1" accessibilityRole="header">
          Archive
        </Text>
        <Text variant="body-sm" tone="secondary" accessibilityLiveRegion="polite">
          {q.isLoading ? 'Loading…' : `${list.length} ${list.length === 1 ? 'case' : 'cases'} · long-press a case to restore it`}
        </Text>
      </View>

      {q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <FlatList
          data={q.isLoading ? [] : list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 12, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isLoading} onRefresh={() => q.refetch()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
          renderItem={({ item }) => (
            <CaseCard
              title={item.title}
              caseNumber={item.caseNumber}
              court={item.court?.name ?? 'Court not set'}
              nextDate={item.nextHearingAt}
              status={caseStatusKind(item)}
              clientName={item.clients[0]?.fullName}
              archived
              onPress={() => router.push({ pathname: '/case/[id]', params: { id: item.id } })}
              onLongPress={() => actions.open(item)}
            />
          )}
          ListEmptyComponent={
            q.isLoading ? (
              <View className="gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : (
              <EmptyState icon={IconArchive} title="Nothing archived" message="Archive a case from its menu to tidy your list. It will wait for you here." />
            )
          }
        />
      )}
      {actions.sheets}
    </View>
  );
}
