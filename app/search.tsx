import { IconArrowLeft, IconBriefcase, IconClock, IconNotes, IconSearch, IconX } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorState } from '@/components/ErrorState';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { LinkText } from '@/components/ui/LinkText';
import { ListGroup, ListRow } from '@/components/ui/ListRow';
import { SearchBar } from '@/components/ui/SearchBar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { PressableScale } from '@/components/ui/PressableScale';
import { useSearch } from '@/hooks/useDashboard';
import { formatPhone } from '@/utils/format';
import { getStored, setStored } from '@/utils/storage';

// SCR-40 Global search: cases, clients and notes, with recent searches
const RECENT_KEY = 'recent-searches';
const MAX_RECENT = 6;

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const search = useSearch(q);

  useEffect(() => {
    getStored<string[]>(RECENT_KEY, []).then(setRecent);
  }, []);

  const remember = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    void setStored(RECENT_KEY, next);
  };
  const forget = (term?: string) => {
    const next = term ? recent.filter((r) => r !== term) : [];
    setRecent(next);
    void setStored(RECENT_KEY, next);
  };
  const use = (term: string) => {
    setText(term);
    setQ(term);
  };

  const data = search.data;
  const total = data ? data.cases.length + data.clients.length + data.notes.length : 0;
  const typing = text.trim().length > 0;
  const waiting = typing && (text.trim() !== q.trim() || search.isLoading);

  const go = (fn: () => void) => {
    remember(q);
    Keyboard.dismiss();
    fn();
  };

  return (
    <View className="flex-1 bg-bg" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2 px-3 pb-3">
        <IconButton icon={IconArrowLeft} accessibilityLabel="Back to home" variant="ghost" onPress={() => router.replace('/')} />
        <SearchBar className="flex-1" value={text} onChangeText={setText} onDebouncedChange={setQ} placeholder="Cases, clients or notes" autoFocus loading={waiting} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }} contentContainerClassName="gap-5 px-5 pt-4">
        {!typing ? (
          recent.length > 0 ? (
            <View className="gap-1">
              <View className="flex-row items-center justify-between">
                <SectionHeader title="Recent" first />
                <LinkText label="Clear" onPress={() => forget()} />
              </View>
              {recent.map((r) => (
                <View key={r} className="flex-row items-center">
                  <PressableScale onPress={() => use(r)} accessibilityRole="button" accessibilityLabel={`Search ${r}`} className="min-h-[48px] flex-1 flex-row items-center gap-3">
                    <Icon icon={IconClock} size={18} tone="tertiary" />
                    <Text variant="body">{r}</Text>
                  </PressableScale>
                  <IconButton icon={IconX} accessibilityLabel={`Remove ${r}`} size="sm" onPress={() => forget(r)} />
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon={IconSearch} title="Search everything" message="Find a case by number or party, a client by name or phone, or text inside your notes." />
          )
        ) : search.isError ? (
          <ErrorState error={search.error} onRetry={() => search.refetch()} />
        ) : waiting && !data ? (
          <SkeletonCard />
        ) : total === 0 ? (
          <EmptyState icon={IconSearch} title="No results" message={`Nothing matches "${q}". Try fewer letters or a case number.`} />
        ) : (
          <>
            {data!.cases.length > 0 ? (
              <View className="gap-1">
                <SectionHeader title={`Cases · ${data!.cases.length}`} first />
                <ListGroup>
                  {data!.cases.map((c) => (
                    <ListRow key={c.id} title={c.title} subtitle={[c.caseNumber, c.court].filter(Boolean).join(' · ')} leadingIcon={IconBriefcase} trailing="chevron" onPress={() => go(() => router.push({ pathname: '/case/[id]', params: { id: c.id } }))} />
                  ))}
                </ListGroup>
              </View>
            ) : null}

            {data!.clients.length > 0 ? (
              <View className="gap-1">
                <SectionHeader title={`Clients · ${data!.clients.length}`} first />
                <ListGroup>
                  {data!.clients.map((c) => (
                    <ListRow key={c.id} title={c.fullName} subtitle={`+91 ${formatPhone(c.phone)}`} leading={<Avatar name={c.fullName} size={40} />} trailing="chevron" onPress={() => go(() => router.push({ pathname: '/client/[id]', params: { id: c.id } }))} />
                  ))}
                </ListGroup>
              </View>
            ) : null}

            {data!.notes.length > 0 ? (
              <View className="gap-1">
                <SectionHeader title={`Notes · ${data!.notes.length}`} first />
                <ListGroup>
                  {data!.notes.map((n) => (
                    <ListRow key={n.id} title={n.title || n.body.slice(0, 40)} subtitle={n.caseTitle} meta={n.body.slice(0, 80)} leadingIcon={IconNotes} trailing="chevron" onPress={() => go(() => router.push({ pathname: '/case/[id]', params: { id: n.caseId } }))} />
                  ))}
                </ListGroup>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

