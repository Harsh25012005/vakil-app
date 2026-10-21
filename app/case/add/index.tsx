import { IconBriefcase, IconEdit, IconFileDescription, IconFilePlus, IconHash, IconShieldCheck, IconUsers } from '@tabler/icons-react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { CourtPicker } from '@/components/CourtPicker';
import { FormScreen } from '@/components/FormScreen';
import { Dialog } from '@/components/ui/Dialog';
import type { IconComponent } from '@/components/ui/Icon';
import { IconBadge } from '@/components/ui/IconBadge';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';
import { useAddCaseFlow } from '@/hooks/useAddCaseFlow';
import { useCaseDraft } from '@/hooks/useCaseDraft';
import { modesFor, SEARCH_MODES, type SearchMode } from '@/services/ecourts';

const MODE_ICONS: Record<SearchMode, IconComponent> = {
  cnr: IconHash,
  number: IconFileDescription,
  filing: IconFilePlus,
  fir: IconShieldCheck,
  party: IconUsers,
  advocate: IconBriefcase,
};

/** A big tap target; laid out two per row by TileGrid. */
function Tile({ icon, title, hint, onPress }: { icon: IconComponent; title: string; hint: string; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      haptic="light"
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      className="min-h-[128px] flex-1 gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <IconBadge icon={icon} tone="primary" size="lg" />
      <View className="gap-0.5">
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={2}>
          {hint}
        </Text>
      </View>
    </PressableScale>
  );
}

type TileProps = Parameters<typeof Tile>[0] & { key: string };

/** Tiles in rows of two, with the same gap between columns as between rows. */
function TileGrid({ tiles }: { tiles: TileProps[] }) {
  const rows: TileProps[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
  return (
    <View className="gap-4">
      {rows.map((row) => (
        <View key={row.map((t) => t.key).join()} className="flex-row gap-4">
          {row.map(({ key, ...t }) => (
            <Tile key={key} {...t} />
          ))}
          {row.length === 1 ? <View className="flex-1" /> : null}
        </View>
      ))}
    </View>
  );
}

// SCR-14 Add case, step 1: the court, then how to find the case there. Each way opens its own form.
export default function AddCaseStart() {
  const router = useRouter();
  const draft = useCaseDraft();
  const court = draft.lastDirectoryCourt;
  const flow = useAddCaseFlow();
  const [confirmClose, setConfirmClose] = useState(false);

  // Every Add case starts with no court picked (recent courts stay one tap away in the list).
  useEffect(() => {
    useCaseDraft.getState().pickCourt(null);
  }, []);

  const close = () => (draft.isDirty() ? setConfirmClose(true) : router.back());

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  });

  const discard = () => {
    draft.reset(true);
    setConfirmClose(false);
    router.back();
  };

  const find = (mode: SearchMode) => {
    draft.setMode(mode);
    router.push({ pathname: '/case/add/find', params: { mode } });
  };

  const modes = modesFor(court);
  const onEcourts = modes.length > 0;
  const manualTile: TileProps = { key: 'manual', icon: IconEdit, title: 'Enter case details', hint: 'Type in the case yourself', onPress: () => void flow.startManual(court) };
  // eCourts courts: their search ways. Tribunals (partly on eCourts): those plus typing the case in.
  // The advocate's own courts: typing it in only.
  const tiles: TileProps[] = [
    ...modes.map((m) => ({ key: m, icon: MODE_ICONS[m], title: SEARCH_MODES[m].title, hint: SEARCH_MODES[m].hint, onPress: () => find(m) })),
    ...(court && (court.level === 'TRIBUNAL' || !onEcourts) ? [manualTile] : []),
  ];

  return (
    <FormScreen
      modal
      avoidKeyboard={false}
      onBack={close}
      eyebrow="Step 1 of 3"
      title="Add case"
      subtitle={!court ? 'Start with the court. Tap below to see every court, or search by name or short form.' : onEcourts ? 'How do you want to find the case?' : 'This court is not on eCourts. Enter the case details yourself.'}
    >
      <CourtPicker value={court} onChange={(c) => draft.pickCourt(c)} recent={draft.recentCourts} />

      {court ? <TileGrid tiles={tiles} /> : null}

      <Dialog open={confirmClose} onClose={() => setConfirmClose(false)} title="Discard this case?" message="Your draft is saved. Keep it to finish later, or discard it." cancelLabel="Keep draft" confirmLabel="Discard" onConfirm={discard} />
    </FormScreen>
  );
}
