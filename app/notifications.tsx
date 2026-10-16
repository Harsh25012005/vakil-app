import { IconBell, IconBellRinging, IconCalendarEvent, IconChecks, IconInfoCircle } from '@tabler/icons-react-native';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/ErrorState';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconBadge } from '@/components/ui/IconBadge';
import { IconButton } from '@/components/ui/IconButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TopAppBar } from '@/components/ui/TopAppBar';
import { useMarkRead, useNotifications } from '@/hooks/useExtras';
import { useTheme } from '@/hooks/useTheme';
import type { AppNotification } from '@/services/types';

// SCR-41 Notification centre: grouped by day, tap to open the related screen
const ICON = { reminder: IconCalendarEvent, needs_update: IconBellRinging, info: IconInfoCircle } as const;
const TONE = { reminder: 'primary', needs_update: 'warning', info: 'info' } as const;

const dayLabel = (iso: string) => {
  const d = parseISO(iso);
  return isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEE, d MMM');
};

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const q = useNotifications();
  const read = useMarkRead();

  const list = q.data ?? [];
  const unread = list.filter((n) => !n.readAt).length;

  const sections = useMemo(() => {
    const map = new Map<string, AppNotification[]>();
    for (const n of list) {
      const k = dayLabel(n.createdAt);
      map.set(k, [...(map.get(k) ?? []), n]);
    }
    return [...map.entries()].map(([title, data]) => ({ title, data }));
  }, [list]);

  const open = (n: AppNotification) => {
    if (!n.readAt) read.mutate([n.id]);
    if (n.deepLink) router.push(n.deepLink as Href);
  };

  return (
    <View className="flex-1 bg-bg">
      <TopAppBar title="" onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} actions={unread > 0 ? <IconButton icon={IconChecks} accessibilityLabel="Mark all as read" onPress={() => read.mutate(undefined)} /> : undefined} />
      <View className="gap-1 px-5 pb-2">
        <Text variant="h1" accessibilityRole="header">
          Notifications
        </Text>
        <Text variant="body-sm" tone="secondary" accessibilityLiveRegion="polite">
          {q.isLoading ? 'Loading…' : unread > 0 ? `${unread} unread` : "You're all caught up"}
        </Text>
      </View>

      {q.isError && !q.data ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <SectionList
          sections={q.isLoading ? [] : sections}
          keyExtractor={(n) => n.id}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={q.isRefetching && !q.isLoading} onRefresh={() => q.refetch()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
          renderSectionHeader={({ section, section: { title } }) => <SectionHeader title={title} first={sections[0] === section} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <Card onPress={() => open(item)} accessibilityLabel={`${item.readAt ? '' : 'Unread. '}${item.title}. ${item.body}`}>
              <View className="flex-row items-start gap-3">
                <IconBadge icon={ICON[item.type]} tone={TONE[item.type]} size="md" />
                <View className="flex-1 gap-0.5">
                  <View className="flex-row items-center gap-2">
                    <Text variant="title" className="flex-1" numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.readAt ? null : <View className="h-2.5 w-2.5 rounded-full bg-primary" />}
                  </View>
                  <Text variant="body-sm" tone="secondary">
                    {item.body}
                  </Text>
                  <Text variant="caption" tone="tertiary" className="pt-1">
                    {format(parseISO(item.createdAt), 'HH:mm') === '00:00' ? format(parseISO(item.createdAt), 'd MMM') : format(parseISO(item.createdAt), 'h:mm a')}
                  </Text>
                </View>
              </View>
            </Card>
          )}
          ListEmptyComponent={
            q.isLoading ? (
              <View className="gap-3">
                <SkeletonCard />
                <SkeletonCard />
              </View>
            ) : (
              <EmptyState icon={IconBell} title="No notifications yet" message="Hearing reminders and update nudges will appear here." />
            )
          }
        />
      )}
    </View>
  );
}
