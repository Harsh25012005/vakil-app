import { IconArrowDown, IconArrowUp, IconPlus } from '@tabler/icons-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { PressableScale } from '@/components/ui/PressableScale';
import { Skeleton } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Toggle } from '@/components/ui/Toggle';
import { useToast } from '@/components/ui/Toast';
import { useCaseTypes, useCourts, useListMutations } from '@/hooks/useLists';
import { errorMessage } from '@/services/api';

type Item = { id: string; name: string; isHidden: boolean };

/** SCR-46 / SCR-47: rename, hide and reorder courts or case types. Hidden items leave pickers but stay on existing cases. */
export function ListManager({ kind }: { kind: 'courts' | 'caseTypes' }) {
  const toast = useToast();
  const courts = useCourts(true);
  const types = useCaseTypes(true);
  const m = useListMutations();
  const q = kind === 'courts' ? courts : types;
  const items: Item[] = q.data ?? [];
  const noun = kind === 'courts' ? 'court' : 'case type';

  const [editing, setEditing] = useState<Item | 'new' | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string>();

  const open = (it: Item | 'new') => {
    setEditing(it);
    setName(it === 'new' ? '' : it.name);
    setError(undefined);
  };

  const run = async (p: Promise<unknown>) => {
    try {
      await p;
    } catch (e) {
      toast.show({ type: 'error', message: errorMessage(e) });
    }
  };

  const save = async () => {
    if (name.trim().length < 2) return setError('Enter at least 2 characters');
    try {
      if (editing === 'new') {
        await (kind === 'courts' ? m.addCourt : m.addCaseType).mutateAsync(name);
        toast.show({ type: 'success', message: `${name.trim()} added` });
      } else if (editing) {
        const patch = { name };
        await (kind === 'courts' ? m.updateCourt.mutateAsync({ id: editing.id, patch }) : m.updateCaseType.mutateAsync({ id: editing.id, patch }));
      }
      setEditing(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const toggle = (it: Item, visible: boolean) => run(kind === 'courts' ? m.updateCourt.mutateAsync({ id: it.id, patch: { isHidden: !visible } }) : m.updateCaseType.mutateAsync({ id: it.id, patch: { isHidden: !visible } }));
  const move = (it: Item, dir: -1 | 1) => run(kind === 'courts' ? m.moveCourt.mutateAsync({ id: it.id, dir }) : m.moveCaseType.mutateAsync({ id: it.id, dir }));

  return (
    <View className="gap-4">
      <Text variant="body-sm" tone="secondary">
        {`Turn a ${noun} off to hide it from pickers. Cases that already use it keep it.`}
      </Text>

      {q.isLoading ? (
        <View className="gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={64} radius={20} />
          ))}
        </View>
      ) : (
        <View className="gap-3">
          {items.map((it, i) => (
            <Card key={it.id} className="flex-row items-center gap-2 py-2 pl-4 pr-2">
              <PressableScale onPress={() => open(it)} accessibilityRole="button" accessibilityLabel={`Rename ${it.name}`} className="min-h-[44px] flex-1 justify-center">
                <Text variant="title" tone={it.isHidden ? 'tertiary' : 'default'} numberOfLines={2}>
                  {it.name}
                </Text>
                {it.isHidden ? (
                  <Text variant="caption" tone="tertiary">
                    Hidden
                  </Text>
                ) : null}
              </PressableScale>
              <IconButton icon={IconArrowUp} accessibilityLabel={`Move ${it.name} up`} size="sm" disabled={i === 0} onPress={() => move(it, -1)} />
              <IconButton icon={IconArrowDown} accessibilityLabel={`Move ${it.name} down`} size="sm" disabled={i === items.length - 1} onPress={() => move(it, 1)} />
              <Toggle value={!it.isHidden} onValueChange={(v) => toggle(it, v)} accessibilityLabel={`Show ${it.name}`} />
            </Card>
          ))}
        </View>
      )}

      <Button label={`Add ${noun}`} variant="secondary" leadingIcon={IconPlus} onPress={() => open('new')} fullWidth />

      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? `Add ${noun}` : `Rename ${noun}`}
        footer={<Button label="Save" onPress={save} fullWidth haptic="light" />}
      >
        <View className="px-5 pb-3">
          <TextField label="Name" value={name} onChangeText={(t) => (setName(t), setError(undefined))} error={error} autoCapitalize="words" returnKeyType="done" onSubmitEditing={save} />
        </View>
      </BottomSheet>
    </View>
  );
}
