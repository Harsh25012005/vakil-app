import { IconBriefcaseOff, IconCalendarPlus, IconDots, IconRefresh } from '@tabler/icons-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaseHearingsTab } from '@/components/CaseHearingsTab';
import { CaseDocumentsTab } from '@/components/CaseDocumentsTab';
import { CaseNotesTab } from '@/components/CaseNotesTab';
import { CaseTasksTab } from '@/components/CaseTasksTab';
import { CaseOverviewTab } from '@/components/CaseOverviewTab';
import { useCaseActions } from '@/components/CaseActions';
import { ErrorState } from '@/components/ErrorState';
import { HearingFormSheet } from '@/components/HearingFormSheet';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { InfoTag } from '@/components/ui/InfoTag';
import { Pill } from '@/components/ui/Pill';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { StatusPill } from '@/components/ui/StatusPill';
import { Tabs } from '@/components/ui/Tabs';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useArchiveCase, useCase, useCourtSyncOnOpen, useRefreshFromEcourts } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import { errorMessage, isApiError } from '@/services/api';
import type { Hearing } from '@/services/types';
import { caseStatusKind } from '@/utils/caseStatus';
import { formatLongDate, formatTime, relativeDay } from '@/utils/date';
import { IconBuildingBank, IconCalendarEvent, IconClock } from '@tabler/icons-react-native';
import { todayISO } from '@/utils/date';

// SCR-19..24 Case detail
type TabKey = 'overview' | 'hearings' | 'documents' | 'notes' | 'tasks';

export default function CaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const q = useCase(id);
  const c = q.data;
  const actions = useCaseActions({ onDeleted: () => router.back() });
  const archive = useArchiveCase(id ?? '');

  const [tab, setTab] = useState<TabKey>('overview');
  const [form, setForm] = useState<Hearing | 'new' | null>(null);
  // Opening a case with a CNR checks the court for new dates, outcomes and orders.
  const sync = useCourtSyncOnOpen(c);
  const toast = useToast();
  const courtRefresh = useRefreshFromEcourts(id ?? '');
  /** "Update from court": the case is read from eCourts again now. */
  const updateFromCourt = async () => {
    if (!c) return;
    try {
      await courtRefresh.mutateAsync(c);
      toast.show({ type: 'success', message: 'Updated from the court' });
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e), actionLabel: 'Retry', onAction: () => void updateFromCourt() });
    }
  };

  const upcoming = useMemo(() => (c ? [...c.hearings].filter((h) => !h.completedAt).sort((a, b) => a.date.localeCompare(b.date))[0] : undefined), [c]);
  const bar = <TopAppBar title="" onBack={() => router.back()} actions={c ? <IconButton icon={IconDots} accessibilityLabel="Case actions" onPress={() => actions.open(c)} /> : undefined} />;

  if (q.isLoading) {
    return (
      <View className="flex-1 bg-bg">
        {bar}
        <View className="gap-4 px-5 pt-2">
          <Skeleton width="70%" height={28} />
          <Skeleton width="40%" height={14} />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      </View>
    );
  }

  if (q.isError || !c) {
    const missing = isApiError(q.error) && q.error.status === 404;
    return (
      <View className="flex-1 bg-bg">
        {bar}
        {missing ? <EmptyState icon={IconBriefcaseOff} title="Case not found" message="It may have been deleted." actionLabel="Back to cases" onAction={() => router.replace('/cases')} /> : <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      </View>
    );
  }

  const due = upcoming ? upcoming.date <= todayISO() : false;
  const overdue = !!upcoming && upcoming.date < todayISO();
  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'hearings', label: 'Hearings', count: c.hearings.length },
    { key: 'documents', label: 'Documents' },
    { key: 'notes', label: 'Notes' },
    { key: 'tasks', label: 'Tasks' },
  ];

  return (
    <View className="flex-1 bg-bg">
      {bar}
      <ScrollView
        stickyHeaderIndices={[2]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        {/* 0: header */}
        <View className="gap-3 px-5 pb-4">
          <Text variant="h2" accessibilityRole="header" selectable>
            {c.title}
          </Text>
          {c.cnr ? (
            <Text variant="body" tone="secondary" tabular selectable>
              {c.cnr}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap gap-2">
            <StatusPill status={caseStatusKind(c)} />
            {c.overdue ? <StatusPill status="overdue" /> : null}
            {c.caseType ? <Pill label={c.caseType.name} tone="neutral" /> : null}
          </View>
        </View>

        {/* 1: next date + banners */}
        <View className="gap-3 px-5 pb-5">
          {c.archivedAt ? <Banner tone="info" message="This case is archived and hidden from your main list." actionLabel="Restore" onAction={() => archive.mutate(false)} /> : null}
          <Card className="gap-3" variant={overdue ? 'default' : 'subtle'}>
            <Text variant="overline" tone={overdue ? 'error' : 'primary'}>
              NEXT HEARING
            </Text>
            {upcoming ? (
              <>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Text variant="h3" tabular>
                    {formatLongDate(upcoming.date)}
                  </Text>
                  <Pill label={relativeDay(upcoming.date)} tone={overdue ? 'error' : due ? 'warning' : 'neutral'} size="sm" />
                </View>
                <View className="gap-1.5">
                  {upcoming.purpose ? (
                    <Text variant="body" tone="secondary">
                      {upcoming.purpose}
                    </Text>
                  ) : null}
                  {upcoming.time ? <InfoTag icon={IconClock} label={formatTime(upcoming.time)} tabular /> : null}
                  {c.court ? <InfoTag icon={IconBuildingBank} label={`${c.court.name}${upcoming.courtRoom ? ` · Room ${upcoming.courtRoom}` : ''}`} /> : null}
                </View>
                {/* Cases not on eCourts: the date is the advocate's to change. */}
                {!c.cnr ? <Button label="Change date" variant="tonal" size="md" leadingIcon={IconCalendarEvent} onPress={() => setForm(upcoming)} fullWidth /> : null}
              </>
            ) : (
              <>
                <Text variant="title">No next date</Text>
                <Text variant="body" tone="secondary">
                  {c.cnr
                    ? c.status === 'active'
                      ? 'The court has not given the next date yet. It appears here as soon as eCourts has it.'
                      : 'This case has no upcoming hearings.'
                    : 'Add the next hearing so reminders and the calendar work for this case.'}
                </Text>
                {!c.cnr ? <Button label="Add hearing" leadingIcon={IconCalendarPlus} size="md" onPress={() => setForm('new')} fullWidth /> : null}
              </>
            )}
            {/* eCourts cases: read the court again now (dates, what happened, orders). */}
            {c.cnr ? (
              <Button
                label={sync.running || courtRefresh.isPending ? 'Updating from court…' : 'Update from court'}
                variant="tonal"
                size="md"
                leadingIcon={IconRefresh}
                onPress={() => void updateFromCourt()}
                loading={sync.running || courtRefresh.isPending}
                fullWidth
                haptic="light"
              />
            ) : null}
          </Card>
        </View>

        {/* 2: sticky tabs */}
        <View className="bg-bg">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
        </View>

        {/* 3: content */}
        <View className="px-5 pt-5">
          {tab === 'overview' ? <CaseOverviewTab c={c} /> : null}
          {tab === 'hearings' ? <CaseHearingsTab c={c} onAdd={() => setForm('new')} onEdit={setForm} /> : null}
          {tab === 'documents' ? <CaseDocumentsTab caseId={c.id} /> : null}
          {tab === 'notes' ? <CaseNotesTab caseId={c.id} /> : null}
          {tab === 'tasks' ? <CaseTasksTab caseId={c.id} /> : null}
        </View>
      </ScrollView>

      <HearingFormSheet caseId={c.id} target={form} defaultRoom={c.courtRoom} onClose={() => setForm(null)} />
      {actions.sheets}
    </View>
  );
}
