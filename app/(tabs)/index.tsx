import { IconBell, IconBuildingBank, IconPlus, IconSearch, IconUserPlus } from '@tabler/icons-react-native';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/ErrorState';
import { HearingItem } from '@/components/HearingItem';
import { OutcomeSheet } from '@/components/OutcomeSheet';
import { Avatar } from '@/components/ui/Avatar';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { InfoTag } from '@/components/ui/InfoTag';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { useToast } from '@/components/ui/Toast';
import { WeekStrip } from '@/components/ui/WeekStrip';
import { useTabBarInset } from '@/components/ui/TabBar';
import { useAuth } from '@/hooks/useAuth';
import { useHearings } from '@/hooks/useCases';
import { useDashboard } from '@/hooks/useDashboard';
import { useTheme } from '@/hooks/useTheme';
import type { HearingRow } from '@/services/hearings';
import { formatLongDate, formatTime, toISODate, today } from '@/utils/date';

// SCR-09 Home dashboard: "What is listed today?" answered in five seconds.
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const router = useRouter();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { colors } = useTheme();
  const advocate = useAuth((s) => s.advocate);

  const dash = useDashboard();
  const todayISO = toISODate(today());
  const [day, setDay] = useState(todayISO);
  const dayHearings = useHearings(day, day);
  const [updating, setUpdating] = useState<HearingRow | null>(null);

  const firstName = useMemo(() => advocate?.fullName.replace(/^adv\.?\s*/i, '').split(' ')[0] || 'there', [advocate?.fullName]);
  const d = dash.data;
  const todayRows = d?.todayRows ?? [];
  const next = todayRows.find((r) => !r.completedAt) ?? todayRows[0];

  const refresh = () => Promise.all([dash.refetch(), dayHearings.refetch()]);

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={dash.isRefetching && !dash.isLoading} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
        contentContainerStyle={{ paddingBottom: tabInset + 8 }}
        contentContainerClassName="gap-6"
      >
        {/* Header */}
        <View className="flex-row items-center gap-3 px-5 pt-3">
          <PressableScale onPress={() => router.push('/settings')} accessibilityRole="button" accessibilityLabel="Open settings and profile" hitSlop={6}>
            <Avatar name={advocate?.fullName || undefined} uri={advocate?.avatarUri} size={40} />
          </PressableScale>
          <View className="flex-1">
            <Text variant="body-sm" tone="secondary">
              {greeting()}
            </Text>
            <Text variant="h2" numberOfLines={1} accessibilityRole="header">
              {firstName}
            </Text>
          </View>
          <IconButton icon={IconSearch} accessibilityLabel="Search cases and clients" variant="tonal" onPress={() => router.push('/search')} />
          <IconButton
            icon={IconBell}
            accessibilityLabel={d?.unreadNotifications ? `Notifications, ${d.unreadNotifications} unread` : 'Notifications'}
            variant="tonal"
            badge={d?.unreadNotifications ? d.unreadNotifications : undefined}
            onPress={() => router.push('/notifications')}
          />
        </View>

        {dash.isError && !d ? (
          <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
        ) : (
          <>
            {/* Today summary */}
            <View className="gap-3 px-5">
              {dash.isLoading ? (
                <SkeletonCard />
              ) : (
                <Card className="gap-4">
                  <View className="gap-1">
                    <Text variant="overline" tone="primary">{`TODAY · ${format(today(), 'EEE, d MMM')}`}</Text>
                    <Text variant="display" tabular accessibilityRole="header">
                      {todayRows.length === 0 ? 'No hearings' : `${todayRows.length} ${todayRows.length === 1 ? 'hearing' : 'hearings'}`}
                    </Text>
                    {next ? (
                      <InfoTag icon={IconBuildingBank} label={`${next.completedAt ? 'Last' : 'First'}: ${next.case.court?.name ?? 'Court'}${next.time ? ` · ${formatTime(next.time)}` : ''}`} className="mt-1" />
                    ) : (
                      <Text variant="body" tone="secondary" className="mt-1">
                        A clear day. A good time to plan tomorrow.
                      </Text>
                    )}
                  </View>
                  <Button
                    label={todayRows.length ? 'View today' : 'Plan tomorrow'}
                    variant={todayRows.length ? 'primary' : 'secondary'}
                    size="md"
                    fullWidth
                    onPress={() => (todayRows.length ? router.push('/today') : router.push('/calendar'))}
                  />
                </Card>
              )}

              {d && d.needsUpdate > 0 ? (
                <Banner
                  tone="warning"
                  title={`${d.needsUpdate} ${d.needsUpdate === 1 ? 'hearing needs' : 'hearings need'} an update`}
                  message="Record the outcome so your diary stays correct."
                  actionLabel="Update now"
                  onAction={() => router.push('/today')}
                />
              ) : null}
            </View>

            {/* Quick actions */}
            <View className="flex-row gap-3 px-5">
              <Button label="Add case" variant="secondary" size="md" leadingIcon={IconPlus} onPress={() => router.push('/case/add')} className="flex-1" fullWidth />
              <Button label="Add client" variant="tonal" size="md" leadingIcon={IconUserPlus} onPress={() => router.push('/client/add')} className="flex-1" fullWidth />
            </View>

            {/* Week */}
            <View>
              <View className="px-5">
                <SectionHeader title="This week" actionLabel="Calendar" onAction={() => router.push('/calendar')} first className="mb-3" />
              </View>
              <WeekStrip selected={day} onSelect={setDay} counts={d?.weekCounts} start={today()} days={7} />
            </View>

            <View className="gap-3 px-5">
              <Text variant="title">{day === todayISO ? 'Listed today' : formatLongDate(day)}</Text>
              {dayHearings.isLoading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : dayHearings.isError ? (
                <ErrorState error={dayHearings.error} onRetry={() => dayHearings.refetch()} />
              ) : dayHearings.data && dayHearings.data.length > 0 ? (
                dayHearings.data.map((h) => <HearingItem key={h.id} hearing={h} onUpdate={setUpdating} />)
              ) : (
                <Card variant="flat" className="items-center gap-1 py-8">
                  <Text variant="title">Nothing listed</Text>
                  <Text variant="body-sm" tone="secondary" className="text-center">
                    {day === todayISO ? 'No hearings today.' : `No hearings on ${format(new Date(day), 'd MMM')}.`}
                  </Text>
                </Card>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <OutcomeSheet
        hearing={updating}
        onClose={() => setUpdating(null)}
        onSaved={({ caseId, outcome }) => {
          if (outcome === 'disposed') toast.show({ type: 'info', message: 'Mark the whole case as disposed?', actionLabel: 'Open case', onAction: () => router.push({ pathname: '/case/[id]', params: { id: caseId } }), duration: 6000 });
        }}
      />
    </View>
  );
}
