import { IconCalendarEvent, IconChevronDown } from '@tabler/icons-react-native';
import { getMonth, getYear, setMonth, setYear } from 'date-fns';
import { useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Dropdown, MenuItem } from '@/components/ui/Dropdown';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { formatLongDate, fromISODate, isPastDate, quickDates, toISODate, today, type ISODate } from '@/utils/date';
import { cn } from '@/utils/cn';
import { CalendarMonth } from '@/components/ui/CalendarMonth';
import { ChoiceChip } from '@/components/ui/Chip';
import { FieldShell, InputBox } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

export type DatePickerProps = {
  label?: string;
  placeholder?: string;
  value: ISODate | null;
  onChange: (value: ISODate) => void;
  required?: boolean;
  helper?: string;
  error?: string;
  /** Next-hearing fields: past dates are allowed but warned (FR-CASE-04). */
  warnIfPast?: boolean;
  showQuickChips?: boolean;
  /** Hearing counts per day, shown as dots in the calendar. */
  counts?: Record<ISODate, number>;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function PillSelect({ label, options, value, onChange, flex }: { label: string; options: { value: number; label: string }[]; value: number; onChange: (v: number) => void; flex: number }) {
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View ref={anchor} collapsable={false} style={{ flex }}>
      <PressableScale
        scaleTo={1}
        onPress={() => setOpen(true)}
        accessibilityRole="combobox"
        accessibilityLabel={`${label}, ${current?.label}`}
        className={cn('h-11 flex-row items-center justify-between gap-2 rounded-full border bg-surface px-4', open ? 'border-primary' : 'border-border-strong')}
      >
        <Text variant="body" numberOfLines={1} className="flex-1">
          {current?.label}
        </Text>
        <Icon icon={IconChevronDown} size={18} tone={open ? 'primary' : 'tertiary'} />
      </PressableScale>
      <Dropdown open={open} onClose={() => setOpen(false)} anchorRef={anchor} accessibilityLabel={label} maxHeight={260}>
        {options.map((o) => (
          <MenuItem key={o.value} label={o.label} selected={o.value === value} onPress={() => { onChange(o.value); setOpen(false); }} />
        ))}
      </Dropdown>
    </View>
  );
}

/** CMP-12. Field shows "DD MMM YYYY, ddd"; sheet has quick chips + calendar grid. */
export function DatePicker({
  label,
  placeholder = 'Pick a date',
  value,
  onChange,
  required,
  helper,
  error,
  warnIfPast,
  showQuickChips = true,
  counts,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [month, setMonth_] = useState<Date>(value ? fromISODate(value) : today());
  const thisYear = getYear(today());
  const years = Array.from({ length: 21 }, (_, i) => thisYear - 10 + i);
  const warning = warnIfPast && value && isPastDate(value) ? 'This date is in the past' : undefined;

  const pick = (iso: ISODate) => {
    onChange(iso);
    setOpen(false);
  };

  return (
    <>
      <FieldShell label={label} required={required} helper={helper} error={error} warning={warning}>
        <PressableScale
          scaleTo={1}
          onPress={() => {
            setMonth_(value ? fromISODate(value) : today());
            setOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${label ?? 'Date'}, ${value ? formatLongDate(value) : 'not set'}`}
        >
          <InputBox focused={open} error={!!error}>
            <Icon icon={IconCalendarEvent} size={20} tone={open ? 'primary' : 'tertiary'} />
            <Text variant="body" tone={value ? 'default' : 'tertiary'} tabular className="flex-1">
              {value ? formatLongDate(value) : placeholder}
            </Text>
            <Icon icon={IconChevronDown} size={20} tone="tertiary" />
          </InputBox>
        </PressableScale>
      </FieldShell>

      <BottomSheet open={open} onClose={() => setOpen(false)} title={label ?? 'Select date'}>
        {showQuickChips ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-5 pb-3">
            {quickDates.map((q) => {
              const iso = toISODate(q.get());
              return <ChoiceChip key={q.key} label={q.label} selected={iso === value} onPress={() => pick(iso)} />;
            })}
          </ScrollView>
        ) : null}
        <View className="mb-2 flex-row gap-3 px-5">
          <PillSelect flex={3} label="Month" value={getMonth(month)} onChange={(m) => setMonth_(setMonth(month, m))} options={MONTHS.map((m, i) => ({ value: i, label: m }))} />
          <PillSelect flex={2} label="Year" value={getYear(month)} onChange={(y) => setMonth_(setYear(month, y))} options={years.map((y) => ({ value: y, label: String(y) }))} />
        </View>
        <View className="px-3">
          <CalendarMonth hideHeader month={month} onMonthChange={setMonth_} selected={value ?? undefined} onSelect={pick} counts={counts} />
        </View>
      </BottomSheet>
    </>
  );
}
