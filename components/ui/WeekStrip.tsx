import { addDays, format } from 'date-fns';
import { ScrollView, View } from 'react-native';
import { cn } from '@/utils/cn';
import { toISODate, today, type ISODate } from '@/utils/date';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

type Props = {
  selected: ISODate;
  onSelect: (date: ISODate) => void;
  counts?: Record<ISODate, number>;
  /** Defaults to today; the strip shows start + 6 days (FR-DASH-03). */
  start?: Date;
  days?: number;
};

/** CMP-33. 56 x 72 capsules (rounded-2xl = half width), selected = primary. */
export function WeekStrip({ selected, onSelect, counts, start = today(), days = 7 }: Props) {
  const todayISO = toISODate(today());
  const list = Array.from({ length: days }, (_, i) => addDays(start, i));

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5">
      {list.map((d) => {
        const iso = toISODate(d);
        const isSel = iso === selected;
        const isToday = iso === todayISO;
        const count = counts?.[iso] ?? 0;
        return (
          <PressableScale
            key={iso}
            haptic="selection"
            onPress={() => onSelect(iso)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSel }}
            accessibilityLabel={`${format(d, 'EEEE d MMMM')}, ${count} hearing${count === 1 ? '' : 's'}`}
            className={cn(
              'h-[72px] w-14 items-center justify-center gap-0.5 overflow-hidden rounded-2xl border',
              isSel ? 'border-primary bg-primary' : isToday ? 'border-primary bg-surface' : 'border-border bg-surface',
            )}
          >
            <Text variant="caption" tone={isSel ? 'on-primary' : 'tertiary'} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} className="px-1">
              {isToday ? 'Today' : format(d, 'EEE')}
            </Text>
            <Text variant="title" tabular tone={isSel ? 'on-primary' : 'default'}>
              {format(d, 'd')}
            </Text>
            <View
              className={cn(
                'h-4 min-w-[16px] items-center justify-center rounded-full px-1',
                count === 0 ? 'opacity-0' : isSel ? 'bg-white/25' : 'bg-primary-subtle',
              )}
            >
              <Text variant="caption" tabular tone={isSel ? 'on-primary' : 'primary'} style={{ fontSize: 10, lineHeight: 12 }} className="font-sans-bold">
                {String(count)}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}
