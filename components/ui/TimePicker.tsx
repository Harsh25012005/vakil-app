import { IconChevronDown, IconClock } from '@tabler/icons-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { cn } from '@/utils/cn';
import { formatTime } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { Button } from '@/components/ui/Button';
import { FieldShell, InputBox } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

const ITEM = 44;
const VISIBLE = 5;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0')); // 00-59
const PERIODS = ['AM', 'PM'];

function Wheel({ items, index, onChange, label }: { items: string[]; index: number; onChange: (i: number) => void; label: string }) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM, animated: false });
    // scroll only on mount; afterwards the wheel owns its position
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ScrollView
      ref={ref}
      accessibilityLabel={label}
      accessibilityValue={{ text: items[index] }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM}
      decelerationRate="fast"
      style={{ height: ITEM * VISIBLE }}
      contentContainerStyle={{ paddingVertical: ITEM * 2 }}
      onMomentumScrollEnd={(e) => {
        const i = Math.max(0, Math.min(items.length - 1, Math.round(e.nativeEvent.contentOffset.y / ITEM)));
        if (i !== index) {
          haptic.selection();
          onChange(i);
        }
      }}
    >
      {items.map((it, i) => (
        <View key={it} style={{ height: ITEM }} className="items-center justify-center">
          <Text variant={i === index ? 'h3' : 'title'} tone={i === index ? 'default' : 'tertiary'} tabular>
            {it}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

export type TimePickerProps = {
  label?: string;
  placeholder?: string;
  /** 24h "HH:mm". */
  value: string | null;
  onChange: (value: string) => void;
  helper?: string;
  error?: string;
};

function split(value: string | null) {
  const [h = 10, m = 30] = (value ?? '10:30').split(':').map(Number);
  return { h12: h % 12 === 0 ? 12 : h % 12, minIdx: Math.min(Math.max(m, 0), 59), pm: h >= 12 };
}

/** CMP-13. Wheel, 12-hour, every minute (00-59). */
export function TimePicker({ label, placeholder = 'Optional', value, onChange, helper, error }: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const init = split(value);
  const [hourIdx, setHourIdx] = useState(init.h12 - 1);
  const [minIdx, setMinIdx] = useState(init.minIdx);
  const [periodIdx, setPeriodIdx] = useState(init.pm ? 1 : 0);

  const confirm = () => {
    const h12 = hourIdx + 1;
    const h24 = (h12 % 12) + (periodIdx === 1 ? 12 : 0);
    onChange(`${String(h24).padStart(2, '0')}:${MINUTES[minIdx]}`);
    setOpen(false);
  };

  return (
    <>
      <FieldShell label={label} helper={helper} error={error}>
        <PressableScale
          scaleTo={1}
          onPress={() => {
            const s = split(value);
            setHourIdx(s.h12 - 1);
            setMinIdx(s.minIdx);
            setPeriodIdx(s.pm ? 1 : 0);
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${label ?? 'Time'}, ${value ? formatTime(value) : 'not set'}`}
        >
          <InputBox focused={open} error={!!error}>
            <Icon icon={IconClock} size={20} tone={open ? 'primary' : 'tertiary'} />
            <Text variant="body" tone={value ? 'default' : 'tertiary'} tabular className="flex-1">
              {value ? formatTime(value) : placeholder}
            </Text>
            <Icon icon={IconChevronDown} size={20} tone="tertiary" />
          </InputBox>
        </PressableScale>
      </FieldShell>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={label ?? 'Select time'} footer={<Button label="Done" onPress={confirm} fullWidth />}>
        <View className="px-5">
          <View className="relative flex-row">
            <View pointerEvents="none" className={cn('absolute left-0 right-0 rounded-xl bg-surface')} style={{ top: ITEM * 2, height: ITEM }} />
            <View className="flex-1">
              <Wheel label="Hour" items={HOURS} index={hourIdx} onChange={setHourIdx} />
            </View>
            <View className="flex-1">
              <Wheel label="Minute" items={MINUTES} index={minIdx} onChange={setMinIdx} />
            </View>
            <View className="flex-1">
              <Wheel label="AM or PM" items={PERIODS} index={periodIdx} onChange={setPeriodIdx} />
            </View>
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
