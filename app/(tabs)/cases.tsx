import { IconArrowsSort, IconBriefcase, IconPlus, IconSearchOff } from '@tabler/icons-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaseCard } from '@/components/CaseCard';
import { useCaseActions } from '@/components/CaseActions';
import { CaseFiltersSheet, countActiveFilters, type CaseFilterValues } from '@/components/CaseFiltersSheet';
import { ErrorState } from '@/components/ErrorState';
import { SORT_OPTIONS, SortSheet, type SortKey } from '@/components/SortSheet';
import { ChoiceChip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Button } from "@/components/ui/Button";
import { SearchBar } from '@/components/ui/SearchBar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTabBarInset } from '@/components/ui/TabBar';
import { Text } from '@/components/ui/Text';
import { useCases } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import type { CaseFilters } from '@/services/types';
import { caseStatusKind } from '@/utils/caseStatus';
import { getStored, setStored } from '@/utils/storage';

// SCR-11 Cases list
const PAGE = 20; // FR-CASE-07: infinite scroll, 20 per page

const STATUS_CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'hearing_today', label: 'Today' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'reserved', label: 'Reserved' },
  { key: 'disposed', label: 'Disposed' },
  { key: 'closed', label: 'Closed' },
];

export default function Cases() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ status?: string }>();

  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [chip, setChip] = useState(params.status && STATUS_CHIPS.some((c) => c.key === params.status) ? params.status : 'all');
  const [filters, setFilters] = useState<CaseFilterValues>({});
  const [sort, setSort] = useState<SortKey>('next_date');
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [visible, setVisible] = useState(PAGE);

  // Deep links from Home's stat strip pick the matching chip.
  useEffect(() => {
    if (params.status && STATUS_CHIPS.some((c) => c.key === params.status)) setChip(params.status);
  }, [params.status]);

  useEffect(() => {
    getStored<SortKey>('case-sort', 'next_date').then(setSort);
  }, []);
  const changeSort = (s: SortKey) => {
    setSort(s);
    void setStored('case-sort', s);
  };

  const query = useMemo<CaseFilters>(
    () => ({ q, sort, ...filters, archived: chip === 'archived', status: chip === 'archived' ? 'all' : (chip as CaseFilters['status']) }),
    [q, sort, filters, chip],
  );
  const cases = useCases(query);
  const actions = useCaseActions();

  useEffect(() => setVisible(PAGE), [query]);

  const list = cases.data ?? [];
  const shown = list.slice(0, visible);
  const activeFilters = countActiveFilters(filters);
  const refining = !!q || activeFilters > 0 || chip !== 'all';
  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? '';

  const clearAll = useCallback(() => {
    setText('');
    setQ('');
    setFilters({});
    setChip('all');
  }, []);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="gap-3 px-5 pb-2 pt-3">
        <View className="flex-row items-center justify-between">
          <View>
            <Text variant="h1" accessibilityRole="header">
              Cases
            </Text>
          </View>
          <IconButton icon={IconPlus} accessibilityLabel="Add case" variant="filled" size="lg" onPress={() => router.push('/case/add')} />
        </View>

        <SearchBar
          value={text}
          onChangeText={setText}
          onDebouncedChange={setQ}
          placeholder="Case no., party, client or court"
          onFilterPress={() => setShowFilters(true)}
          filterCount={activeFilters || undefined}
        />
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 py-1" keyboardShouldPersistTaps="handled">
          {STATUS_CHIPS.map((c) => (
            <ChoiceChip key={c.key} label={c.label} selected={chip === c.key} onPress={() => setChip(c.key)} />
          ))}
        </ScrollView>
      </View>

      <View className="flex-row items-center justify-between px-5 pb-2 pt-3">
        <Text variant="body-sm" tone="secondary" tabular accessibilityLiveRegion="polite">
          {cases.isLoading ? 'Loading…' : `${list.length} ${list.length === 1 ? 'case' : 'cases'}`}
        </Text>
        <Button label={sortLabel} variant="outline" size="sm" leadingIcon={IconArrowsSort} onPress={() => setShowSort(true)} accessibilityLabel={`Sort: ${sortLabel}`} />
      </View>

      {cases.isError && !cases.data ? (
        <ErrorState error={cases.error} onRetry={() => cases.refetch()} />
      ) : (
        <FlatList
          data={cases.isLoading ? [] : shown}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: tabInset + 8, gap: 12, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.6}
          onEndReached={() => visible < list.length && setVisible((v) => v + PAGE)}
          refreshControl={<RefreshControl refreshing={cases.isRefetching && !cases.isLoading} onRefresh={() => cases.refetch()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
          renderItem={({ item }) => (
            <CaseCard
              title={item.title}
              caseNumber={item.caseNumber}
              court={item.court?.name ?? 'Court not set'}
              nextDate={item.nextHearingAt}
              status={caseStatusKind(item)}
              clientName={item.clients[0]?.fullName}
              overdue={item.overdue}
              archived={!!item.archivedAt}
              onPress={() => router.push({ pathname: '/case/[id]', params: { id: item.id } })}
              onLongPress={() => actions.open(item)}
            />
          )}
          ListEmptyComponent={
            cases.isLoading ? (
              <View className="gap-3">
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : refining ? (
              <EmptyState icon={IconSearchOff} title="No cases match" message={q ? `Nothing found for "${q}". Try a case number, party, client or court.` : 'No cases match these filters.'} actionLabel="Clear filters" onAction={clearAll} />
            ) : (
              <EmptyState icon={IconBriefcase} title="No cases yet" message="Add your first case to start tracking hearings." actionLabel="Add your first case" onAction={() => router.push('/case/add')} />
            )
          }
          ListFooterComponent={visible < list.length ? <Text variant="caption" tone="tertiary" className="py-3 text-center">Loading more…</Text> : null}
        />
      )}

      <CaseFiltersSheet open={showFilters} values={filters} resultCount={list.length} onApply={setFilters} onClose={() => setShowFilters(false)} />
      <SortSheet open={showSort} value={sort} onChange={changeSort} onClose={() => setShowSort(false)} />
      {actions.sheets}
    </View>
  );
}
