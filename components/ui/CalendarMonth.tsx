import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react-native';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameMonth, startOfMonth, startOfWeek } from 'date-fns';
import { Pressable, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { cn } from '@/utils/cn';
import { toISODate, today, type ISODate } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { IconButton } from '@/components/ui/IconButton';
import { LinkText } from '@/components/ui/LinkText';
import { Text } from '@/components/ui/Text';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export type CalendarMonthProps = {
  month: Date;
  onMonthChange: (month: Date) => void;
  selected?: ISODate;
  onSelect: (date: ISODate) => void;
  /** Hearings per day → up to 3 dots, "+" when more (FR-CAL-01). */
  counts?: Record<ISODate, number>;
  /** Hide the month title and arrows when month/year are chosen elsewhere (date picker dropdowns). */
  hideHeader?: boolean;
};

function Dots({ count, inverse }: { count: number; inverse: boolean }) {
  if (count <= 0) return null;
  const dots = Math.min(count, 3);
  return (
    <View className="absolute bottom-1 flex-row items-center gap-0.5">
      {Array.from({ length: dots }, (_, i) =>
        count > 3 && i === 2 ? (
          <Text key={i} tone={inverse ? 'on-primary' : 'primary'} style={{ fontSize: 9, lineHeight: 9 }} className="font-sans-bold">
            +
          </Text>
        ) : (
          <View key={i} className={cn('h-1 w-1 rounded-full', inverse ? 'bg-white' : 'bg-primary')} />
        ),
      )}
    </View>
  );
}

/** CMP-32. 44 dp cells, today ring, selected fill, swipe between months, 200 ms fade. */
export function CalendarMonth({ month, onMonthChange, selected, onSelect, counts, hideHeader }: CalendarMonthProps) {
  const todayISO = toISODate(today());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }),
  });
  const weeks = Array.from({ length: days.length / 7 }, (_, w) => days.slice(w * 7, w * 7 + 7));

  const go = (delta: number) => {
    haptic.selection();
    onMonthChange(addMonths(month, delta));
  };

  const swipe = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .runOnJS(true)
    .onEnd((e) => {
      if (e.translationX < -60) go(1);
      else if (e.translationX > 60) go(-1);
    });

  const isCurrentMonth = isSameMonth(month, today());

  return (
    <View>
      {hideHeader ? null : (
      <View className="mb-2 flex-row items-center gap-1 pl-2">
        <Text variant="title" className="flex-1" accessibilityRole="header">
          {format(month, 'MMMM yyyy')}
        </Text>
        {!isCurrentMonth ? <LinkText label="Today" onPress={() => onMonthChange(today())} className="mr-2 self-center" /> : null}
        <IconButton icon={IconChevronLeft} accessibilityLabel="Previous month" onPress={() => go(-1)} size="md" />
        <IconButton icon={IconChevronRight} accessibilityLabel="Next month" onPress={() => go(1)} size="md" />
      </View>
      )}

      <View className="flex-row">
        {WEEKDAYS.map((d, i) => (
          <Text key={i} variant="caption" tone="tertiary" className="flex-1 py-1 text-center">
            {d}
          </Text>
        ))}
      </View>

      <GestureDetector gesture={swipe}>
        <Animated.View key={format(month, 'yyyy-MM')} entering={FadeIn.duration(200)}>
          {weeks.map((week, wi) => (
            <View key={wi} className="flex-row">
              {week.map((day) => {
                const iso = toISODate(day);
                const inMonth = isSameMonth(day, month);
                const isSel = iso === selected;
                const isToday = iso === todayISO;
                const count = counts?.[iso] ?? 0;
                return (
                  <Pressable
                    key={iso}
                    onPress={() => {
                      haptic.selection();
                      onSelect(iso);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSel }}
                    accessibilityLabel={`${format(day, 'd MMMM')}${count ? `, ${count} hearing${count > 1 ? 's' : ''}` : ''}${isToday ? ', today' : ''}`}
                    className="h-11 flex-1 items-center justify-center"
                  >
                    <View
                      className={cn(
                        'h-10 w-10 items-center justify-center rounded-full',
                        isSel ? 'bg-primary' : isToday ? 'border-[1.5px] border-primary' : '',
                      )}
                    >
                      <Text
                        variant="body"
                        tabular
                        tone={isSel ? 'on-primary' : !inMonth ? 'disabled' : isToday ? 'primary' : 'default'}
                        className={cn((isSel || isToday) && 'font-sans-bold')}
                      >
                        {format(day, 'd')}
                      </Text>
                      <Dots count={inMonth ? count : 0} inverse={isSel} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
