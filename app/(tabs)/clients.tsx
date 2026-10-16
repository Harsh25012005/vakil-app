import { IconPencil, IconPlus, IconSearchOff, IconUsers } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { ListRow } from '@/components/ui/ListRow';
import { SwipeableRow } from '@/components/ui/SwipeableRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useTabBarInset } from '@/components/ui/TabBar';
import { Text } from '@/components/ui/Text';
import { useClients } from '@/hooks/useClients';
import { useTheme } from '@/hooks/useTheme';
import { formatPhone } from '@/utils/format';

// SCR-33 Clients list
export default function ClientsList() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabInset = useTabBarInset();
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const clients = useClients(q);
  const list = clients.data ?? [];

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top }}>
      <View className="gap-3 px-5 pb-2 pt-3">
        <View className="flex-row items-center justify-between">
          <Text variant="h1" accessibilityRole="header">
            Clients
          </Text>
          <IconButton icon={IconPlus} accessibilityLabel="Add client" variant="filled" size="lg" onPress={() => router.push('/client/add')} />
        </View>
        <SearchBar value={text} onChangeText={setText} onDebouncedChange={setQ} placeholder="Name, phone or email" />
      </View>

      <Text variant="body-sm" tone="secondary" tabular className="px-5 pb-2 pt-2" accessibilityLiveRegion="polite">
        {clients.isLoading ? 'Loading…' : `${list.length} ${list.length === 1 ? 'client' : 'clients'}`}
      </Text>

      {clients.isError && !clients.data ? (
        <ErrorState error={clients.error} onRetry={() => clients.refetch()} />
      ) : (
        <FlatList
          data={clients.isLoading ? [] : list}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingBottom: tabInset + 8, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={clients.isRefetching && !clients.isLoading} onRefresh={() => clients.refetch()} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface2} />}
          renderItem={({ item }) => (
            <SwipeableRow
              className="bg-bg"
              trailing={[{ key: 'edit', label: 'Edit', icon: IconPencil, tone: 'brand', onPress: () => router.push({ pathname: '/client/add', params: { id: item.id } }) }]}
            >
              <ListRow
                title={item.fullName}
                subtitle={`+91 ${formatPhone(item.phone)}`}
                meta={item.caseCount === 1 ? '1 case' : `${item.caseCount} cases`}
                leading={<Avatar name={item.fullName} size={40} />}
                trailing="chevron"
                divider
                onPress={() => router.push({ pathname: '/client/[id]', params: { id: item.id } })}
              />
            </SwipeableRow>
          )}
          ListEmptyComponent={
            clients.isLoading ? (
              <View className="gap-3 px-5">
                {[0, 1, 2].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </View>
            ) : q ? (
              <EmptyState icon={IconSearchOff} title="No clients match" message={`Nothing found for "${q}".`} actionLabel="Clear search" onAction={() => (setText(''), setQ(''))} />
            ) : (
              <EmptyState icon={IconUsers} title="No clients yet" message="Add clients to link them to cases and reach them in one tap." actionLabel="Add a client" onAction={() => router.push('/client/add')} />
            )
          }
        />
      )}
    </View>
  );
}
