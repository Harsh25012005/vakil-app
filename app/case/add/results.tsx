import { IconSearchOff } from '@tabler/icons-react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { courtMeta } from '@/components/CourtPicker';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { EmptyState } from '@/components/ui/EmptyState';
import { LinkText } from '@/components/ui/LinkText';
import { Pill } from '@/components/ui/Pill';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useAddCaseFlow } from '@/hooks/useAddCaseFlow';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { useCaseSearch } from '@/hooks/useCaseSearch';
import { useTheme } from '@/hooks/useTheme';
import { errorMessage } from '@/services/api';
import { existingCnrs } from '@/services/cases';
import { searchCases, SEARCH_MODES, type CaseSearchResult } from '@/services/ecourts';
import { formatShortDate } from '@/utils/date';
import { haptic } from '@/utils/haptics';

const side = (first: string | undefined, all: string[]) => (first ? `${first}${all.length > 1 ? ' and others' : ''}` : undefined);
const parties = (r: CaseSearchResult) => [side(r.petitioners[0], r.petitioners), side(r.respondents[0], r.respondents)].filter(Boolean).join(' v. ') || r.cnr;

// SCR-14 Add case, step 2b: the cases eCourts found. Tick one or more and add them in one go, or
// check one case's details first.
export default function AddCaseResults() {
  const router = useRouter();
  const navigation = useNavigation();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const court = useCaseDraft((s) => s.lastDirectoryCourt);
  const s = useCaseSearch();
  const flow = useAddCaseFlow();
  const [loadingMore, setLoadingMore] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Cases already in the advocate's list can't be picked again.
  const cnrs = useMemo(() => s.results.map((r) => r.cnr), [s.results]);
  const existing = useQuery({ queryKey: ['existing-cnrs', cnrs], queryFn: () => existingCnrs(cnrs), enabled: cnrs.length > 0 });
  const have = existing.data ?? new Set<string>();
  const selectable = s.results.filter((r) => !have.has(r.cnr));
  const allPicked = selectable.length > 0 && selectable.every((r) => picked.has(r.cnr));

  const toggle = (cnr: string) => {
    haptic.selection();
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(cnr)) next.delete(cnr);
      else next.add(cnr);
      return next;
    });
  };

  const more = async () => {
    if (!s.query) return;
    setLoadingMore(true);
    try {
      const query = { ...s.query, page: s.page + 1, wide: s.widened || undefined };
      s.setResults(query, await searchCases(query), true);
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: () => void more() });
    } finally {
      setLoadingMore(false);
    }
  };

  const addPicked = async () => {
    const list = s.results.filter((r) => picked.has(r.cnr)).map((r) => r.cnr);
    const res = await flow.addMany(list);
    const parts = [
      res.added ? `${res.added} ${res.added === 1 ? 'case' : 'cases'} added` : null,
      res.skipped ? `${res.skipped} already in your list` : null,
      res.failed.length ? `${res.failed.length} couldn't be added` : null,
    ].filter(Boolean);
    if (res.failed.length) {
      // Keep the ones that failed ticked, to try again.
      setPicked(new Set(res.failed.map((f) => f.cnr).filter(Boolean)));
      void existing.refetch();
      haptic.warning();
      toast.show({ type: 'error', message: `${parts.join(', ')}. ${res.failed[0]!.reason}` });
      return;
    }
    haptic.success();
    toast.show({ type: 'success', message: `${parts.join(', ')}.` });
    useCaseSearch.getState().clear();
    navigation.getParent()?.goBack(); // close Add case
  };

  const label = s.query ? SEARCH_MODES[s.query.mode].title.toLowerCase() : 'search';
  const count = s.total > s.results.length ? `${s.results.length} of ${s.total}` : String(s.results.length);
  const n = picked.size;
  const busy = !!flow.adding;

  return (
    <View className="flex-1 bg-bg">
      <TopAppBar title="" onBack={() => router.back()} variant="compact" />
      <FlatList
        data={s.results}
        keyExtractor={(r) => r.cnr}
        contentContainerClassName="gap-3 px-5 pb-6"
        ListHeaderComponent={
          <View className="mb-3 gap-2">
            <Text variant="overline" tone="primary">
              Step 2 of 3
            </Text>
            <Text variant="h1" accessibilityRole="header">
              {s.results.length ? `${count} ${s.results.length === 1 ? 'case' : 'cases'} found` : 'No cases found'}
            </Text>
            <Text variant="body" tone="secondary">
              {[`By ${label}`, court?.name].filter(Boolean).join(' · ')}
              {court ? `\n${courtMeta(court)}` : ''}
            </Text>
            {s.widened && s.results.length ? <Banner tone="info" message="Nothing matched in this district, so these are from the whole state. Check the court on each case." className="mt-2" /> : null}
            {selectable.length > 1 ? (
              <View className="mt-1 flex-row items-center justify-between">
                <Text variant="caption" tone="tertiary">
                  Tick the cases to add.
                </Text>
                <LinkText label={allPicked ? 'Clear all' : 'Select all'} onPress={() => setPicked(allPicked ? new Set() : new Set(selectable.map((r) => r.cnr)))} />
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item: r }) => {
          const added = have.has(r.cnr);
          const on = picked.has(r.cnr);
          return (
            <Card
              onPress={added || busy ? undefined : () => toggle(r.cnr)}
              accessibilityLabel={`${on ? 'Selected. ' : ''}${parties(r)}, ${r.caseNumber ?? r.cnr}${added ? ', already added' : ''}`}
              className={on ? 'border-primary' : undefined}
            >
              <View className="flex-row gap-3">
                <View className="pt-0.5">{added ? <Checkbox checked disabled decorative /> : <Checkbox checked={on} decorative />}</View>
                <View className="flex-1 gap-1.5">
                  <View className="flex-row items-start gap-2">
                    <Text variant="body" className="flex-1 font-sans-semibold" numberOfLines={2}>
                      {parties(r)}
                    </Text>
                    {flow.opening === r.cnr ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : added ? (
                      <Pill label="Already added" tone="primary" size="sm" />
                    ) : (
                      <Pill label={r.disposed ? 'Disposed' : (r.status ?? 'Pending')} tone={r.disposed ? 'neutral' : 'success'} size="sm" />
                    )}
                  </View>
                  <Text variant="body-sm" tone="secondary" numberOfLines={1}>
                    {[r.caseType, r.caseNumber].filter(Boolean).join(' ') || r.cnr}
                  </Text>
                  <Text variant="caption" tone="tertiary" numberOfLines={2}>
                    {[r.courtName, r.nextHearingDate && !r.disposed ? `Next ${formatShortDate(r.nextHearingDate)}` : r.decisionDate ? `Decided ${formatShortDate(r.decisionDate)}` : undefined, r.cnr].filter(Boolean).join(' · ')}
                  </Text>
                </View>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            icon={IconSearchOff}
            title="Nothing matched"
            message="Check the number and year, or try another way to find the case. Cases filed in the last few days may not be on eCourts yet."
            actionLabel="Change search"
            onAction={() => router.back()}
          />
        }
        ListFooterComponent={s.hasMore ? <Button label="Show more" variant="tonal" onPress={() => void more()} loading={loadingMore} disabled={busy} fullWidth className="mt-2" /> : null}
      />

      {n > 0 ? (
        <View className="gap-2 border-t border-border bg-bg px-5 pt-4" style={{ paddingBottom: Math.max(insets.bottom, 16) }}>
          <Button
            label={flow.adding ? `Adding ${Math.min(flow.adding.done + 1, flow.adding.total)} of ${flow.adding.total}…` : `Add ${n} ${n === 1 ? 'case' : 'cases'}`}
            onPress={() => void addPicked()}
            loading={busy}
            fullWidth
            haptic="light"
          />
          {n === 1 && !busy ? (
            <Button label="Check details first" variant="tonal" onPress={() => void flow.openCase([...picked][0]!)} loading={!!flow.opening} fullWidth />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
