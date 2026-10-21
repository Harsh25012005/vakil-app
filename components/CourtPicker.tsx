import { IconBuildingBank, IconCheck, IconChevronDown, IconClock, IconMapPin, IconPlus } from '@tabler/icons-react-native';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Pressable, View } from 'react-native';
import { qk } from '@/hooks/queryKeys';
import { useCourts, useListMutations } from '@/hooks/useLists';
import { useTheme } from '@/hooks/useTheme';
import { errorMessage } from '@/services/api';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/haptics';
import { getDirectoryCourts, listCourtDirectoryPage, matchOwnCourts, ownCourtEntry, searchCourtDirectory, syncCourtDirectory, type DirectoryCourt } from '@/services/ecourts';
import { BottomSheet } from './ui/BottomSheet';
import { FieldShell, InputBox } from './ui/Field';
import { Icon } from './ui/Icon';
import { IconBadge } from './ui/IconBadge';
import { ListRow } from './ui/ListRow';
import { Pill } from './ui/Pill';
import { PressableScale } from './ui/PressableScale';
import { SearchBar } from './ui/SearchBar';
import { Skeleton } from './ui/Skeleton';
import { Text } from './ui/Text';
import { useToast } from './ui/Toast';

/** "High Court · Gujarat", "DRT · Gujarat", "District court · Pune, Maharashtra", "Your court". */
export function courtMeta(c: DirectoryCourt) {
  if (c.level === 'SC') return 'Supreme Court · New Delhi';
  if (c.level === 'HC') return ['High Court', c.bench ? `${c.bench} bench` : c.stateName].filter(Boolean).join(' · ');
  if (c.level === 'TRIBUNAL') return [c.shortName ?? 'Tribunal', c.stateName].filter(Boolean).join(' · ');
  if (c.level === 'OTHER') return ['Your court', c.districtName].filter(Boolean).join(' · ');
  return ['District court', [c.districtName, c.stateName].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
}

const PAGE = 60;
/** How long the picked court shows its check before the sheet closes. */
const PICK_DELAY_MS = 220;

/**
 * One court in the list. Press: shrinks a little and shades (core Animated: Reanimated styles
 * don't paint inside the sheet's Modal on Android). Picked: brand tint and a check.
 */
function CourtRow({ court, recent, selected, onPress }: { court: DirectoryCourt; recent?: boolean; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => to(0.97)}
      onPressOut={() => to(1)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${court.name}, ${courtMeta(court)}`}
    >
      {({ pressed }) => (
        <Animated.View style={{ transform: [{ scale }] }} className={cn('mx-2 flex-row items-center gap-3 rounded-lg px-3 py-3', selected ? 'bg-primary-subtle' : pressed ? 'bg-surface' : '')}>
          <IconBadge icon={recent ? IconClock : court.level === 'DC' ? IconMapPin : IconBuildingBank} tone={court.level === 'DC' ? 'neutral' : 'primary'} size="sm" />
          <View className="flex-1 gap-0.5">
            <Text variant="body" tone={selected ? 'primary' : 'default'} numberOfLines={1}>
              {court.name}
            </Text>
            <Text variant="body-sm" tone="secondary" numberOfLines={2}>
              {courtMeta(court)}
            </Text>
          </View>
          {court.shortName ? <Pill label={court.shortName} size="sm" tone={selected ? 'primary' : 'neutral'} /> : null}
          {selected ? <Icon icon={IconCheck} size={20} tone="primary" strokeWidth={2.5} /> : null}
        </Animated.View>
      )}
    </Pressable>
  );
}

type Item =
  | { kind: 'header'; key: string; title: string }
  | { kind: 'court'; key: string; court: DirectoryCourt; recent?: boolean }
  | { kind: 'add'; key: string; name: string };

type Props = {
  value: DirectoryCourt | null;
  onChange: (c: DirectoryCourt) => void;
  /** Recently picked courts, newest first (shown above the full list). */
  recent?: DirectoryCourt[];
  error?: string;
};

/**
 * Court field for Add case. Tapping it opens every court in India (Supreme Court, all High Courts
 * and benches, tribunals, every district court complex) plus the advocate's own courts, with a
 * search: full names and short forms both work ("GHC", "DRT", "ccc ahd", "pune"). A court that
 * isn't listed can be added by name.
 */
export function CourtPicker({ value, onChange, recent = [], error }: Props) {
  const { colors } = useTheme();
  const toast = useToast();
  const { addCourt } = useListMutations();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const typing = query.trim().length > 0;

  useEffect(() => {
    if (open) syncCourtDirectory();
  }, [open]);

  const search = useQuery({
    queryKey: qk.courtDirectory(debounced.trim().toLowerCase()),
    queryFn: () => searchCourtDirectory(debounced, 60),
    enabled: open && debounced.trim().length > 0,
    staleTime: 10 * 60_000,
    placeholderData: keepPreviousData,
  });

  // The full list, a page at a time as the user scrolls.
  const all = useInfiniteQuery({
    queryKey: ['court-directory', 'all'],
    queryFn: ({ pageParam }) => listCourtDirectoryPage(pageParam, PAGE),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length === PAGE ? pages.length * PAGE : undefined),
    enabled: open,
    staleTime: 10 * 60_000,
  });

  // Courts already used on cases, so the usual court is one tap away.
  const mine = useCourts();
  const linkedIds = useMemo(() => (mine.data ?? []).map((c) => c.directoryId).filter((x): x is string => !!x), [mine.data]);
  const linked = useQuery({ queryKey: ['court-directory', 'linked', linkedIds], queryFn: () => getDirectoryCourts(linkedIds), enabled: open && linkedIds.length > 0, staleTime: 10 * 60_000 });

  const items = useMemo<Item[]>(() => {
    const own = mine.data ?? [];
    if (typing) {
      // An own court named exactly like a listed court shows once (the listed one).
      const listed = new Set((search.data ?? []).map((c) => c.name.toLowerCase()));
      const matches = [...matchOwnCourts(own, query).filter((c) => !listed.has(c.name.toLowerCase())), ...(search.data ?? [])];
      const name = query.trim().replace(/\s+/g, ' ');
      const exact = matches.some((c) => c.name.toLowerCase() === name.toLowerCase());
      // "Add as new court" only once the search has answered, so it can't be tapped by mistake.
      const settled = !search.isFetching && debounced.trim() === query.trim();
      return [
        ...matches.map((c) => ({ kind: 'court', key: c.id, court: c }) as const),
        ...(settled && name.length >= 2 && !exact ? [{ kind: 'add', key: 'add', name } as const] : []),
      ];
    }
    const seen = new Set<string>();
    const shortcuts = [...recent, ...(linked.data ?? []), ...own.filter((c) => !c.directoryId && !c.isHidden).map(ownCourtEntry)].filter((c) => !seen.has(c.id) && seen.add(c.id));
    const list = (all.data?.pages ?? []).flat();
    return [
      ...(shortcuts.length ? [{ kind: 'header', key: 'h-recent', title: 'Recent and your courts' } as const, ...shortcuts.map((c) => ({ kind: 'court', key: `r-${c.id}`, court: c, recent: true }) as const)] : []),
      ...(list.length ? [{ kind: 'header', key: 'h-all', title: 'All courts' } as const] : []),
      ...list.map((c) => ({ kind: 'court', key: c.id, court: c }) as const),
    ];
  }, [typing, query, debounced, search.data, search.isFetching, recent, linked.data, all.data, mine.data]);

  /** The tapped court shows its check for a moment, then the sheet closes. */
  const [justPicked, setJustPicked] = useState<string | null>(null);
  const pick = (c: DirectoryCourt) => {
    if (justPicked) return;
    setJustPicked(c.id);
    haptic.selection();
    setTimeout(() => {
      onChange(c);
      setOpen(false);
      setQuery('');
      setDebounced('');
      setJustPicked(null);
    }, PICK_DELAY_MS);
  };

  /** A court that isn't in the list, added to the advocate's own courts under the typed name. */
  const addNew = async (name: string) => {
    try {
      pick(ownCourtEntry(await addCourt.mutateAsync(name)));
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const loading = typing ? search.isLoading : all.isLoading;

  return (
    <FieldShell label="Court" required error={error}>
      <PressableScale scaleTo={1} onPress={() => setOpen(true)} accessibilityRole="combobox" accessibilityLabel={`Court${value ? `, ${value.name}` : ', search court'}`}>
        <InputBox focused={open} error={!!error}>
          <Icon icon={IconBuildingBank} size={20} tone={value ? 'primary' : 'tertiary'} />
          <View className="flex-1 py-1">
            <Text variant="body" tone={value ? 'default' : 'tertiary'} numberOfLines={1}>
              {value?.name ?? 'Search court'}
            </Text>
            {value ? (
              <Text variant="caption" tone="tertiary" numberOfLines={1}>
                {courtMeta(value)}
              </Text>
            ) : null}
          </View>
          <Icon icon={IconChevronDown} size={20} tone="tertiary" />
        </InputBox>
      </PressableScale>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="Select court" snapPoints={['90%']} avoidKeyboard={false}>
        <View className="px-5 pb-3">
          <SearchBar value={query} onChangeText={setQuery} onDebouncedChange={setDebounced} placeholder="Court name, city or short form (GHC, DRT)" loading={search.isFetching} variant="outline" />
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => i.key}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-6"
          // Thousands of courts: render a few screens' worth at a time.
          initialNumToRender={16}
          maxToRenderPerBatch={16}
          windowSize={7}
          removeClippedSubviews
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (!typing && all.hasNextPage && !all.isFetchingNextPage) void all.fetchNextPage();
          }}
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <Text variant="overline" tone="tertiary" className="px-5 pb-1 pt-3">
                {item.title}
              </Text>
            ) : item.kind === 'add' ? (
              <View className="pt-2">
                {items.length === 1 ? (
                  <Text variant="body-sm" tone="tertiary" className="px-5 pb-2">
                    {`No court in the list matches "${item.name}". Try the city or a short form (HC, DC, DRT), or add it as your own court.`}
                  </Text>
                ) : null}
                <ListRow
                  title={`Add "${item.name}" as a new court`}
                  subtitle="For a court that isn't listed. You can use a short name."
                  leadingIcon={IconPlus}
                  leadingTone="primary"
                  onPress={() => void addNew(item.name)}
                  disabled={addCourt.isPending}
                />
              </View>
            ) : (
              <CourtRow court={item.court} recent={item.recent} selected={(justPicked ?? value?.id) === item.court.id} onPress={() => pick(item.court)} />
            )
          }
          ListFooterComponent={!typing && all.isFetchingNextPage ? <ActivityIndicator style={{ paddingVertical: 16 }} color={colors.primary} /> : null}
          ListEmptyComponent={
            loading ? (
              <View className="gap-3 px-5 pt-2">
                <Skeleton width="80%" height={16} />
                <Skeleton width="60%" height={16} />
                <Skeleton width="70%" height={16} />
              </View>
            ) : (
              <View className="gap-1 px-5 pt-4">
                <Text variant="body" tone="secondary">
                  {typing ? `No court matches "${query.trim()}".` : "Couldn't load the court list."}
                </Text>
                <Text variant="body-sm" tone="tertiary">
                  {typing ? 'Try the city or district name ("Mahesana"), or a short form like HC, DC, DRT.' : 'Check your connection and open the list again.'}
                </Text>
              </View>
            )
          }
        />
      </BottomSheet>
    </FieldShell>
  );
}
