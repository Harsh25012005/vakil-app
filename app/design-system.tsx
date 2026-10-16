import {
  IconAlertTriangle,
  IconArchive,
  IconArrowRight,
  IconBell,
  IconBriefcase,
  IconBuildingBank,
  IconCalendarEvent,
  IconCheck,
  IconDownload,
  IconEdit,
  IconFileText,
  IconGavel,
  IconMoon,
  IconPlus,
  IconSearch,
  IconShare,
  IconSun,
  IconTrash,
} from '@tabler/icons-react-native';
import type { Theme } from '@vakil/shared';
import { router } from 'expo-router';
import { useRef, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ActionSheet,
  AmountInput,
  Avatar,
  Badge,
  Banner,
  BottomSheet,
  Button,
  BUTTON_SIZES,
  BUTTON_VARIANTS,
  CalendarMonth,
  CaseCard,
  Checkbox,
  ChoiceChip,
  ClientCard,
  DatePicker,
  Dialog,
  DocumentTile,
  Dropdown,
  EmptyState,
  FilterChip,
  GradientSurface,
  HearingCard,
  IconButton,
  InfoTag,
  InputChip,
  KeyValueRow,
  LinearProgress,
  LinkText,
  ListGroup,
  ListRow,
  MenuItem,
  MultiSelect,
  NoteCard,
  OtpInput,
  OutcomePill,
  PhoneInput,
  RadioGroup,
  RingProgress,
  SearchBar,
  SectionHeader,
  Select,
  SkeletonCard,
  SkeletonRow,
  StatusPill,
  SwipeableRow,
  Tabs,
  Text,
  TextArea,
  TextField,
  TimePicker,
  Timeline,
  Toggle,
  TopAppBar,
  WeekStrip,
  useToast,
  type ButtonVariant,
  type CaseStatusKind,
  type IconButtonVariant,
} from '@/components';
import { ComponentDoc, DocSection, SwatchGrid, Variation } from '@/components/docs/doc';
import { SectionIndex, type SectionIndexHandle } from '@/components/docs/SectionIndex';
import { toISODate, today } from '@/utils/date';
import { gradients, night, palette, radius, status, type GradientName, type StatusName } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * Living style guide (/design-system): tokens first, then every CMP with all its variations,
 * in whichever theme is active. Use it for design QA before building screens.
 */

const SECTIONS = ['Colors', 'Type', 'Shape', 'Actions', 'Inputs', 'Selection', 'Display', 'Cards', 'Navigation', 'Feedback', 'Overlays'] as const;
type SectionName = (typeof SECTIONS)[number];

const VARIANT_NOTES: Record<ButtonVariant, string> = {
  primary: 'Main action. One per view. Brand gradient fill.',
  secondary: 'Brand-tinted secondary action.',
  tonal: 'Neutral, low emphasis next to a primary.',
  outline: 'Alternative action, e.g. Cancel in dialogs.',
  ghost: 'Lowest emphasis, toolbars and inline.',
  link: 'Text-only, inline with content.',
  success: 'Confirming a positive outcome.',
  destructive: 'Final, irreversible actions.',
  'destructive-soft': 'Destructive but recoverable.',
  'destructive-ghost': 'Quiet destructive (Remove).',
};

const ICON_VARIANTS: IconButtonVariant[] = ['filled', 'secondary', 'tonal', 'outline', 'ghost', 'destructive'];
const STATUSES: CaseStatusKind[] = ['active', 'today', 'adjourned', 'reserved', 'overdue', 'disposed', 'closed'];
const COURTS = ['City Civil Court, Ahmedabad', 'Metropolitan Magistrate Court 12', 'Family Court, Ahmedabad', 'Gujarat High Court'].map((c) => ({ value: c, label: c }));
const CASE_TYPES = ['Civil Suit', 'Criminal Case', 'NI Act 138', 'Family', 'MACT', 'Writ', 'Appeal', 'Bail', 'Consumer', 'Other'].map((a) => ({ value: a, label: a }));
const AREAS = ['Civil', 'Criminal', 'Family', 'NI Act 138', 'MACT', 'Writ', 'Consumer', 'Labour', 'Property', 'Tax'].map((a) => ({ value: a, label: a }));

function Row({ children, wrap = true }: { children: ReactNode; wrap?: boolean }) {
  return <View className={wrap ? 'flex-row flex-wrap items-center gap-3' : 'flex-row items-center gap-3'}>{children}</View>;
}

export default function DesignSystem() {
  const { mode, setMode, scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const todayISO = toISODate(today());
  const scrollRef = useRef<ScrollView>(null);
  const offsets = useRef<Partial<Record<SectionName, number>>>({});
  // Sections are measured inside the padded column; add its own offset to get page positions.
  const columnY = useRef(0);
  const menuAnchor = useRef<View>(null);

  const indexRef = useRef<SectionIndexHandle>(null);
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [query, setQuery] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [amount, setAmount] = useState<number | null>(125000);
  const [court, setCourt] = useState<string | null>(null);
  const [caseType, setCaseType] = useState<string | null>('NI Act 138');
  const [areas, setAreas] = useState<string[]>(['Civil', 'Criminal']);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>('10:30');
  const [toggle, setToggle] = useState(true);
  const [check, setCheck] = useState(true);
  const [sort, setSort] = useState('next');
  const [chips, setChips] = useState<string[]>(['active']);
  const [quick, setQuick] = useState('1w');
  const [tab, setTab] = useState('overview');
  const [weekDay, setWeekDay] = useState(todayISO);
  const [month, setMonth] = useState(today());
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [actions, setActions] = useState(false);
  const [dialog, setDialog] = useState<null | 'confirm' | 'destructive' | 'info'>(null);

  const mark = (name: SectionName) => (e: { nativeEvent: { layout: { y: number } } }) => {
    offsets.current[name] = e.nativeEvent.layout.y;
  };
  const selectChip = (name: SectionName) => indexRef.current?.setActive(name);

  const jump = (name: SectionName) => {
    selectChip(name);
    const y = offsets.current[name];
    // 72 = sticky index height, so the section title lands just below it.
    if (y !== undefined) scrollRef.current?.scrollTo({ y: columnY.current + y - 72, animated: true });
  };

  // Keep the sticky index in sync with whatever section is under it.
  const onScroll = (y: number) => {
    let current: SectionName = SECTIONS[0];
    for (const s of SECTIONS) {
      const off = offsets.current[s];
      // A section becomes active once its heading passes the upper third of the screen.
      if (off !== undefined && columnY.current + off - 260 <= y) current = s;
    }
    selectChip(current);
  };

  const neutral = scheme === 'dark' ? Object.entries(night) : Object.entries(palette.ink);
  const semanticList: { name: string; hex: string }[] = [
    { name: 'bg', hex: colors.bg },
    { name: 'surface', hex: colors.surface },
    { name: 'surface-2', hex: colors.surface2 },
    { name: 'border', hex: colors.border },
    { name: 'border-strong', hex: colors.borderStrong },
    { name: 'text', hex: colors.text },
    { name: 'text-2', hex: colors.text2 },
    { name: 'text-3', hex: colors.text3 },
    { name: 'primary', hex: colors.primary },
    { name: 'primary-pressed', hex: colors.primaryPressed },
    { name: 'primary-subtle', hex: colors.primarySubtle },
    { name: 'primary-fg', hex: colors.primaryFg },
  ];

  return (
    <View className="flex-1 bg-bg">
      <TopAppBar
        title="Design system"
        onBack={router.canGoBack() ? router.back : undefined}
        actions={
          <IconButton
            icon={scheme === 'dark' ? IconSun : IconMoon}
            accessibilityLabel={scheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            variant="tonal"
            onPress={() => setMode(scheme === 'dark' ? 'light' : 'dark')}
          />
        }
      />

      <ScrollView
        ref={scrollRef}
        stickyHeaderIndices={[1]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={64}
        onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
      >
        {/* 0: intro */}
        <View className="px-5 pt-2">
          <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
              <Text variant="overline" tone="primary">
                Vakil.app · v1
              </Text>
              <Text variant="h1">
                Design system
              </Text>
              <Text variant="body" tone="secondary">
                Tokens and 51 components from the FRS, in dark (default) and light. Every color here is a semantic token, never raw hex.
              </Text>
              <View className="mt-1 flex-row flex-wrap gap-2">
                {['51 components', '2 themes', 'Pill + soft radius'].map((t) => (
                  <View key={t} className="rounded-full bg-primary-subtle px-3 py-1">
                    <Text variant="caption" tone="primary">
                      {t}
                    </Text>
                  </View>
                ))}
              </View>
          </View>
          <View className="mt-4">
            <Row>
              {(['dark', 'light', 'system'] as Theme[]).map((t) => (
                <ChoiceChip key={t} label={t[0]!.toUpperCase() + t.slice(1)} selected={mode === t} onPress={() => setMode(t)} />
              ))}
            </Row>
          </View>
        </View>

        {/* 1: sticky section index */}
        <View className="border-b border-border bg-bg pb-3 pt-4">
          <SectionIndex ref={indexRef} sections={SECTIONS} onSelect={(s) => jump(s as SectionName)} />
        </View>

        <View className="px-5" onLayout={(e) => (columnY.current = e.nativeEvent.layout.y)}>
          {/* ───────────── COLORS ───────────── */}
          <DocSection onLayout={mark('Colors')} eyebrow="Foundations" title="Colors" description="One brand blue, a neutral scale per theme, and five status hues that only ever carry meaning.">
            <ComponentDoc name="Brand blue" description="blue-500 is primary in dark, blue-600 in light. Text on tints uses primary-fg.">
              <SwatchGrid items={Object.entries(palette.blue).map(([k, v]) => ({ name: `blue-${k}`, hex: v }))} />
            </ComponentDoc>
            <ComponentDoc
              name={scheme === 'dark' ? 'Neutral · night (dark)' : 'Neutral · ink (light)'}
              description={scheme === 'dark' ? 'True black base. Depth comes from lighter surfaces, not shadows.' : 'Blue-tinted greys keep light mode calm instead of flat.'}
            >
              <SwatchGrid items={neutral.map(([k, v]) => ({ name: `${scheme === 'dark' ? 'night' : 'ink'}-${k}`, hex: v }))} />
            </ComponentDoc>
            <ComponentDoc name="Semantic tokens" description={`Live values for the ${scheme} theme. Components use only these.`}>
              <SwatchGrid items={semanticList} columns={3} />
            </ComponentDoc>
            <ComponentDoc name="Status" description="Base for dots and solid fills, bg / fg for tinted pills and banners.">
              {(Object.keys(status) as StatusName[]).map((s) => (
                <Variation key={s} label={s}>
                  <SwatchGrid
                    columns={3}
                    size="sm"
                    items={[
                      { name: 'base', hex: status[s].base },
                      { name: 'bg', hex: status[s][scheme].bg },
                      { name: 'fg', hex: status[s][scheme].fg },
                    ]}
                  />
                </Variation>
              ))}
            </ComponentDoc>
            <ComponentDoc name="Gradients" description="At most one gradient element per screen (plus skeletons).">
              {(Object.keys(gradients) as GradientName[]).map((g) => (
                <View key={g} className="gap-1.5">
                  <GradientSurface variant={g} className="h-14 rounded-lg" />
                  <Text variant="caption" tone="secondary">{`grad-${g} · ${gradients[g].colors.join(' → ')}`}</Text>
                </View>
              ))}
            </ComponentDoc>
          </DocSection>

          {/* ───────────── TYPE ───────────── */}
          <DocSection onLayout={mark('Type')} eyebrow="Foundations" title="Typography" description="Plus Jakarta Sans. Numbers use tabular figures so dates and amounts align.">
            <ComponentDoc name="Type scale">
              {(
                [
                  ['display', 'Display', '32 / 40 · ExtraBold'],
                  ['h1', 'Heading 1', '28 / 36 · Bold'],
                  ['h2', 'Heading 2', '24 / 32 · Bold'],
                  ['h3', 'Heading 3', '20 / 28 · SemiBold'],
                  ['title', 'Title', '17 / 24 · SemiBold'],
                  ['body-lg', 'Body large', '16 / 24 · Regular'],
                  ['body', 'Body', '15 / 22 · Regular'],
                  ['body-sm', 'Body small', '13 / 20 · Medium'],
                  ['caption', 'Caption', '12 / 16 · Medium'],
                  ['overline', 'Overline', '11 / 16 · Bold caps'],
                  ['stat', '1,25,000', '28 / 32 · ExtraBold tabular'],
                ] as const
              ).map(([v, sample, spec]) => (
                <View key={v} className="flex-row items-baseline justify-between gap-3">
                  <Text variant={v} className="flex-1" numberOfLines={1}>
                    {sample}
                  </Text>
                  <Text variant="caption" tone="tertiary">
                    {spec}
                  </Text>
                </View>
              ))}
            </ComponentDoc>
          </DocSection>

          {/* ───────────── SHAPE ───────────── */}
          <DocSection onLayout={mark('Shape')} eyebrow="Foundations" title="Shape" description="Pill for anything you tap, soft corners for containers. Nested corners stay concentric.">
            <ComponentDoc name="Radius scale">
              <Row wrap={false}>
                {(
                  [
                    ['8', radius.sm, 'Checkbox'],
                    ['12', radius.md, 'Menu rows'],
                    ['16', radius.lg, 'Inputs'],
                    ['20', radius.xl, 'Cards'],
                    ['28', radius['2xl'], 'Sheets'],
                    ['Pill', 999, 'Buttons'],
                  ] as const
                ).map(([label, r, use]) => (
                  <View key={label} className="flex-1 items-center gap-1.5">
                    <View className="h-12 w-full border-[1.5px] border-primary bg-primary-subtle" style={{ borderRadius: Math.min(r, 24) }} />
                    <Text variant="caption">{label}</Text>
                    <Text variant="caption" tone="tertiary" style={{ fontSize: 10 }}>
                      {use}
                    </Text>
                  </View>
                ))}
              </Row>
            </ComponentDoc>
          </DocSection>

          {/* ───────────── ACTIONS ───────────── */}
          <DocSection onLayout={mark('Actions')} eyebrow="CMP-01 – 06" title="Actions">
            <ComponentDoc name="Button" cmp="CMP-01" description="Pill shape at every size. Pressed scales to 0.97; loading keeps the width; disabled is 40%.">
              <Variation label="Variants">
                {BUTTON_VARIANTS.map((v) => (
                    <View key={v} className="gap-1.5">
                      <Button
                        label={v === 'link' ? 'Link button' : v.replace('-', ' ').replace(/^./, (c) => c.toUpperCase())}
                        variant={v}
                        fullWidth={v !== 'link'}
                        leadingIcon={v.startsWith('destructive') ? IconTrash : v === 'success' ? IconCheck : undefined}
                        onPress={() => {}}
                      />
                      <Text variant="caption" tone="tertiary">{`${v} · ${VARIANT_NOTES[v]}`}</Text>
                    </View>
                ))}
              </Variation>
              <Variation label="Sizes · xs 32 · sm 36 · md 44 · lg 52">
                <Row>
                  {BUTTON_SIZES.map((s) => (
                    <Button key={s} label={s.toUpperCase()} size={s} onPress={() => {}} />
                  ))}
                </Row>
                <Row>
                  {BUTTON_SIZES.map((s) => (
                    <Button key={s} label={s.toUpperCase()} size={s} variant="outline" onPress={() => {}} />
                  ))}
                </Row>
              </Variation>
              <Variation label="With icons">
                <Row>
                  <Button label="Add case" size="md" leadingIcon={IconPlus} onPress={() => {}} />
                  <Button label="Next" size="md" variant="secondary" trailingIcon={IconArrowRight} onPress={() => {}} />
                  <Button label="Download" size="md" variant="tonal" leadingIcon={IconDownload} onPress={() => {}} />
                  <Button label="Share" size="md" variant="outline" leadingIcon={IconShare} onPress={() => {}} />
                </Row>
              </Variation>
              <Variation label="States">
                <Row>
                  <Button label="Default" size="md" onPress={() => {}} />
                  <Button label="Saving" size="md" loading onPress={() => {}} />
                  <Button label="Disabled" size="md" disabled onPress={() => {}} />
                  <Button label="Disabled" size="md" variant="outline" disabled onPress={() => {}} />
                </Row>
              </Variation>
              <Variation label="Pairs and full width">
                <View className="flex-row gap-3">
                  <Button label="Cancel" variant="outline" size="md" fullWidth className="flex-1" onPress={() => {}} />
                  <Button label="Save" size="md" fullWidth className="flex-1" onPress={() => {}} />
                </View>
              </Variation>
            </ComponentDoc>

            <ComponentDoc name="Icon button" cmp="CMP-02" description="Circle by default; touch target is always 48 dp. Every icon button needs an accessibility label.">
              <Variation label="Variants">
                <Row>
                  {ICON_VARIANTS.map((v) => (
                    <View key={v} className="items-center gap-1.5">
                      <IconButton icon={v === 'destructive' ? IconTrash : IconEdit} accessibilityLabel={v} variant={v} size="lg" />
                      <Text variant="caption" tone="tertiary" style={{ fontSize: 10 }}>
                        {v}
                      </Text>
                    </View>
                  ))}
                </Row>
              </Variation>
              <Variation label="Sizes · 32 · 40 · 48 · and square">
                <Row>
                  <IconButton icon={IconPlus} accessibilityLabel="Add" variant="filled" size="sm" />
                  <IconButton icon={IconPlus} accessibilityLabel="Add" variant="filled" size="md" />
                  <IconButton icon={IconPlus} accessibilityLabel="Add" variant="filled" size="lg" />
                  <IconButton icon={IconSearch} accessibilityLabel="Search" variant="tonal" size="lg" shape="rounded" />
                  <IconButton icon={IconBell} accessibilityLabel="Notifications, 4 unread" variant="tonal" size="lg" badge={4} />
                  <IconButton icon={IconBell} accessibilityLabel="Notifications" variant="tonal" size="lg" badge="dot" />
                </Row>
              </Variation>
            </ComponentDoc>

            <ComponentDoc name="Link" cmp="CMP-04">
              <Row>
                <LinkText label="Use email instead" onPress={() => {}} />
                <LinkText label="See all" variant="chevron" onPress={() => {}} />
              </Row>
              <Text variant="body" tone="secondary">
                By continuing you agree to the <LinkText variant="inline" label="privacy policy" onPress={() => {}} />.
              </Text>
            </ComponentDoc>

            <ComponentDoc name="Swipe actions" cmp="CMP-06" description="Swipe the row left or right.">
              <View className="overflow-hidden rounded-xl border border-border">
                <SwipeableRow
                  leading={[{ key: 'done', label: 'Disposed', icon: IconCheck, tone: 'success', onPress: () => {} }]}
                  trailing={[
                    { key: 'edit', label: 'Edit', icon: IconEdit, tone: 'brand', onPress: () => {} },
                    { key: 'del', label: 'Delete', icon: IconTrash, tone: 'error', onPress: () => {} },
                  ]}
                >
                  <ListRow title="Mehta v. Shah" subtitle="City Civil Court · 12 Nov" leading={<Avatar name="Rohan Mehta" size={40} />} />
                </SwipeableRow>
              </View>
            </ComponentDoc>
          </DocSection>

          {/* ───────────── INPUTS ───────────── */}
          <DocSection onLayout={mark('Inputs')} eyebrow="CMP-07 – 17" title="Inputs" description="All fields share one chrome: 52 dp, radius 16, label above, helper or error below.">
            <ComponentDoc name="Text field" cmp="CMP-07">
              <TextField label="Case title" required placeholder="Petitioner v. Respondent" value={text} onChangeText={setText} clearable helper="Leave blank to auto-compose" />
              <TextField label="Search court" leadingIcon={IconBuildingBank} placeholder="With leading icon" />
              <TextField label="CNR" placeholder="GJAH010012342026" value="GJAH01001234" error="CNR must be 16 characters" />
              <TextField label="Outline · read only" value="Adv. Rohan Mehta" readOnly variant="outline" />
              <TextField label="Disabled" value="Not editable" disabled />
            </ComponentDoc>
            <ComponentDoc name="Text area" cmp="CMP-08" description="Grows from 3 to 10 lines.">
              <TextArea label="Notes" placeholder="Arguments, points to raise…" value={notes} onChangeText={setNotes} maxLength={500} showCounter />
            </ComponentDoc>
            <ComponentDoc name="Search bar" cmp="CMP-09" description="Pill, 44 dp, debounced 300 ms.">
              <SearchBar value={query} onChangeText={setQuery} />
              <SearchBar value={query} onChangeText={setQuery} onFilterPress={() => {}} filterCount={2} />
              <SearchBar value={query} onChangeText={setQuery} onCancel={() => setQuery('')} placeholder="Expanded with cancel" />
            </ComponentDoc>
            <ComponentDoc name="Dropdown select" cmp="CMP-10" description="Opens a dropdown under the field. More than 8 options adds search; courts and case types allow Add new.">
              <Select label="Court" required placeholder="Select court" value={court} onChange={setCourt} options={COURTS} leadingIcon={IconBuildingBank} onAddNew={() => {}} addNewLabel="Add court" />
              <Select label="Case type (searchable)" value={caseType} onChange={setCaseType} options={CASE_TYPES} />
              <Select label="With error" value={null} onChange={() => {}} options={COURTS} error="Select a court" />
            </ComponentDoc>
            <ComponentDoc name="Multi-select dropdown" cmp="CMP-11" description="Checkboxes apply instantly; chips collapse into +N.">
              <MultiSelect label="Practice areas" values={areas} onChange={setAreas} options={AREAS} />
            </ComponentDoc>
            <ComponentDoc name="Date picker" cmp="CMP-12" description="Quick chips plus calendar. Past dates warn for next hearing.">
              <DatePicker label="Next hearing" value={date} onChange={setDate} warnIfPast counts={{ [todayISO]: 3 }} />
            </ComponentDoc>
            <ComponentDoc name="Time picker" cmp="CMP-13" description="12-hour wheel, every minute (00-59).">
              <TimePicker label="Time" value={time} onChange={setTime} />
            </ComponentDoc>
            <ComponentDoc name="Phone input" cmp="CMP-14">
              <PhoneInput value={phone} onChangeText={setPhone} />
            </ComponentDoc>
            <ComponentDoc name="Amount input" cmp="CMP-16" description="₹ prefix, Indian grouping.">
              <AmountInput label="Agreed fee" value={amount} onChange={setAmount} />
            </ComponentDoc>
            <ComponentDoc name="OTP input" cmp="CMP-15">
              <Variation label="Default">
                <OtpInput value={otp} onChange={setOtp} autoFocus={false} />
              </Variation>
              <Variation label="Error">
                <OtpInput value="482" onChange={() => {}} autoFocus={false} error />
              </Variation>
            </ComponentDoc>
          </DocSection>

          {/* ───────────── SELECTION ───────────── */}
          <DocSection onLayout={mark('Selection')} eyebrow="CMP-18 – 24" title="Selection">
            <ComponentDoc name="Toggle" cmp="CMP-18">
              <Toggle label="Evening digest" description="8:00 PM the day before" value={toggle} onValueChange={setToggle} />
              <Toggle label="Morning digest" description="8:00 AM" value={!toggle} onValueChange={(v) => setToggle(!v)} />
              <Toggle label="Disabled" value={false} onValueChange={() => {}} disabled />
            </ComponentDoc>
            <ComponentDoc name="Checkbox" cmp="CMP-19">
              <Row>
                <Checkbox checked={check} onChange={setCheck} label="Checked" />
                <Checkbox checked={false} onChange={() => {}} label="Unchecked" />
                <Checkbox checked={false} indeterminate label="Mixed" />
              </Row>
            </ComponentDoc>
            <ComponentDoc name="Radio" cmp="CMP-20">
              <RadioGroup
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'next', label: 'Next hearing date' },
                  { value: 'recent', label: 'Recently added' },
                  { value: 'az', label: 'Title A-Z' },
                ]}
              />
            </ComponentDoc>
            <ComponentDoc name="Chips" cmp="CMP-22 – 24">
              <Variation label="Filter chip">
                <Row>
                  {(['active', 'reserved', 'disposed'] as const).map((k) => (
                    <FilterChip
                      key={k}
                      label={k[0]!.toUpperCase() + k.slice(1)}
                      count={k === 'active' ? 48 : undefined}
                      selected={chips.includes(k)}
                      onPress={() => setChips((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]))}
                    />
                  ))}
                </Row>
              </Variation>
              <Variation label="Choice chip">
                <Row>
                  {[
                    ['1w', '+1 week'],
                    ['2w', '+2 weeks'],
                    ['1m', '+1 month'],
                  ].map(([k, l]) => (
                    <ChoiceChip key={k} label={l!} selected={quick === k} onPress={() => setQuick(k!)} />
                  ))}
                </Row>
              </Variation>
              <Variation label="Input chip">
                <Row>
                  <InputChip label="Rohan Mehta" avatar={{ name: 'Rohan Mehta' }} onRemove={() => {}} />
                  <InputChip label="Civil" onRemove={() => {}} />
                </Row>
              </Variation>
            </ComponentDoc>
          </DocSection>

          {/* ───────────── DISPLAY ───────────── */}
          <DocSection onLayout={mark('Display')} eyebrow="CMP-25 – 36" title="Data display">
            <ComponentDoc name="Status pill" cmp="CMP-25" description="Always text + icon; color is never the only signal.">
              <Row>
                {STATUSES.map((s) => (
                  <StatusPill key={s} status={s} />
                ))}
              </Row>
              <Variation label="Hearing outcome">
                <Row>
                  <OutcomePill outcome="adjourned" />
                  <OutcomePill outcome="arguments_done" />
                  <OutcomePill outcome="reserved" />
                  <OutcomePill outcome="not_reached" />
                  <OutcomePill outcome="disposed" />
                </Row>
              </Variation>
            </ComponentDoc>
            <ComponentDoc name="Badge" cmp="CMP-26">
              <Row>
                <Badge variant="count" count={3} />
                <Badge variant="count" count={120} />
                <Badge variant="dot" />
                <Badge variant="text" label="New" />
              </Row>
            </ComponentDoc>
            <ComponentDoc name="Avatar" cmp="CMP-27" description="Initials tinted from the name; the advocate gets a gradient ring.">
              <Row>
                <Avatar name="Rohan Mehta" size={24} />
                <Avatar name="Priya Shah" size={32} />
                <Avatar name="Anil Patel" size={40} />
                <Avatar name="Meera Iyer" size={56} />
                <Avatar name="Rohan Mehta" size={56} ring />
                <Avatar size={40} />
              </Row>
            </ComponentDoc>
            <ComponentDoc name="List row" cmp="CMP-28" description="Dividers align with the text column automatically.">
              <ListGroup>
                <ListRow title="Appearance" value="Dark" leadingIcon={IconMoon} trailing="chevron" onPress={() => {}} />
                <ListRow title="Manage courts" subtitle="4 courts, 9 case types" leadingIcon={IconBuildingBank} trailing="chevron" onPress={() => {}} />
                <ListRow title="Reminders" trailing={<Toggle value={toggle} onValueChange={setToggle} accessibilityLabel="Reminders" />} leadingIcon={IconBell} />
                <ListRow title="Delete account" leadingIcon={IconTrash} destructive onPress={() => {}} />
              </ListGroup>
            </ComponentDoc>
            <ComponentDoc name="Section header" cmp="CMP-29">
              <SectionHeader title="Today" actionLabel="See all" onAction={() => {}} first />
            </ComponentDoc>
            <ComponentDoc name="Key-value row" cmp="CMP-30">
              <View>
                <KeyValueRow label="Case no." value="CS/1234/2026" copyable tabular divider />
                <KeyValueRow label="CNR" value="GJAH010012342026" copyable tabular divider />
                <KeyValueRow label="Judge" value={null} />
              </View>
            </ComponentDoc>
            <ComponentDoc name="Timeline" cmp="CMP-31" description="Newest on top; future hearings above the Today marker.">
              <Timeline
                items={[
                  { id: '1', date: '2026-11-12', purpose: 'Reply by respondent' },
                  { id: '2', date: todayISO, time: '11:00', purpose: 'Arguments' },
                  { id: '3', date: '2026-09-02', outcome: 'adjourned', notes: 'Respondent sought time to file reply' },
                  { id: '4', date: '2026-07-18', outcome: 'evidence', notes: 'PW-1 examined' },
                ]}
              />
            </ComponentDoc>
            <ComponentDoc name="Calendar month" cmp="CMP-32">
              <CalendarMonth month={month} onMonthChange={setMonth} selected={weekDay} onSelect={setWeekDay} counts={{ [todayISO]: 2 }} />
            </ComponentDoc>
            <ComponentDoc name="Week strip" cmp="CMP-33">
              <View className="-mx-4">
                <WeekStrip selected={weekDay} onSelect={setWeekDay} counts={{ [todayISO]: 4 }} />
              </View>
            </ComponentDoc>
            <ComponentDoc name="Progress" cmp="CMP-34">
              <LinearProgress value={0.6} />
              <LinearProgress value={0.4} tone="success" />
              <LinearProgress indeterminate />
              <Row>
                <RingProgress value={0.65}>
                  <Text variant="title" tabular>
                    65%
                  </Text>
                </RingProgress>
                <RingProgress value={1} tone="success">
                  <Text variant="title" tabular>
                    100%
                  </Text>
                </RingProgress>
              </Row>
            </ComponentDoc>
            <ComponentDoc name="Info tag" cmp="CMP-36">
              <InfoTag icon={IconBuildingBank} label="City Civil Court, Room 12" />
              <InfoTag icon={IconCalendarEvent} label="12 Nov 2026, Thu" tabular />
              <InfoTag icon={IconAlertTriangle} label="Next date overdue" tone="error" />
            </ComponentDoc>
          </DocSection>

          {/* ───────────── CARDS ───────────── */}
          <DocSection onLayout={mark('Cards')} eyebrow="CMP-37 – 44" title="Cards" description="Every card shares one shell: surface, 1 dp border, radius 20, 16 padding.">
            <ComponentDoc name="Case card" cmp="CMP-39">
              <CaseCard title="Mehta v. Shah" caseNumber="CS/1234/2026" court="City Civil Court, Ahmedabad" nextDate="2026-11-12" status="active" clientName="Rohan Mehta" onPress={() => {}} />
              <CaseCard title="State v. Patel (NI Act 138)" caseNumber="CC/88/2025" court="MM Court 12" nextDate="2026-09-30" status="active" overdue clientName="Anil Patel" onPress={() => {}} />
              <CaseCard title="Desai v. Desai" caseNumber="FC/41/2024" court="Family Court" nextDate={null} status="closed" archived onPress={() => {}} />
            </ComponentDoc>
            <ComponentDoc name="Hearing card" cmp="CMP-40">
              <HearingCard caseTitle="Mehta v. Shah" caseNumber="CS/1234/2026" time="10:30" courtRoom="12" stage="Arguments" lastOutcome="adjourned" state="upcoming" onUpdate={() => {}} />
              <HearingCard caseTitle="Desai v. Desai" time="14:00" courtRoom="3" state="needs-update" onUpdate={() => {}} />
              <HearingCard caseTitle="State v. Patel" time="11:15" courtRoom="7" state="done" outcome="reserved" />
            </ComponentDoc>
            <ComponentDoc name="Client card" cmp="CMP-41">
              <ClientCard name="Priya Shah" phone="9876543210" caseCount={3} onPress={() => {}} onCall={() => {}} onWhatsApp={() => {}} />
            </ComponentDoc>
            <ComponentDoc name="Document tile" cmp="CMP-42">
              <View className="flex-row gap-3">
                <DocumentTile name="Interim order 02-09-2026.pdf" mimeType="application/pdf" sizeBytes={1_240_000} date="2026-09-02" onMore={() => {}} />
                <DocumentTile name="Vakalatnama.jpg" mimeType="image/jpeg" sizeBytes={640_000} date="2026-07-18" onMore={() => {}} />
              </View>
              <DocumentTile variant="list" name="Reply affidavit.docx" mimeType="application/msword" sizeBytes={88_000} date="2026-10-01" onMore={() => {}} />
            </ComponentDoc>
            <ComponentDoc name="Note card" cmp="CMP-43">
              <NoteCard title="Points for arguments" body="1. Limitation not applicable. 2. Cheque issued towards legally enforceable debt. 3. Notice served within 30 days." updatedLabel="Updated 2h ago" pinned />
              <NoteCard body="Call client about original cheque before next date." updatedLabel="Yesterday" />
            </ComponentDoc>
          </DocSection>

          {/* ───────────── NAVIGATION ───────────── */}
          <DocSection onLayout={mark('Navigation')} eyebrow="CMP-45 – 47" title="Navigation">
            <ComponentDoc name="Tabs" cmp="CMP-47">
              <Variation label="Underline">
                <Tabs
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    { key: 'overview', label: 'Overview' },
                    { key: 'hearings', label: 'Hearings', count: 6 },
                    { key: 'documents', label: 'Documents' },
                    { key: 'notes', label: 'Notes' },
                    { key: 'fees', label: 'Fees' },
                  ]}
                />
              </Variation>
              <Variation label="Pill">
                <View className="-mx-4">
                  <Tabs
                    variant="pill"
                    value={tab}
                    onChange={setTab}
                    tabs={[
                      { key: 'overview', label: 'All' },
                      { key: 'hearings', label: 'Petition' },
                      { key: 'documents', label: 'Orders' },
                    ]}
                  />
                </View>
              </Variation>
            </ComponentDoc>
            <ComponentDoc name="Top app bar and tab bar" cmp="CMP-45 – 46" description="Shown live: the bar at the top of this page, and the bottom tab bar on the (tabs) screens." />
          </DocSection>

          {/* ───────────── FEEDBACK ───────────── */}
          <DocSection onLayout={mark('Feedback')} eyebrow="CMP-48 – 51" title="Feedback">
            <ComponentDoc name="Toast" cmp="CMP-48" description="Slides in from the top, styled like the banner. 4 s, or 5 s with an action.">
              <Row>
                <Button size="sm" variant="tonal" label="Success" onPress={() => toast.show({ type: 'success', message: 'Case saved' })} />
                <Button size="sm" variant="tonal" label="With undo" onPress={() => toast.show({ message: 'Note deleted', actionLabel: 'Undo', onAction: () => {} })} />
                <Button size="sm" variant="tonal" label="Error" onPress={() => toast.show({ type: 'error', message: "Couldn't save. Check your connection.", actionLabel: 'Retry' })} />
              </Row>
            </ComponentDoc>
            <ComponentDoc name="Inline banner" cmp="CMP-49">
              <Banner tone="offline" message="You're offline. Changes will sync when you're back." />
              <Banner tone="warning" title="2 hearings need an update" message="Record today's outcomes so your diary stays correct." actionLabel="Update now" onAction={() => {}} onDismiss={() => {}} />
              <Banner tone="error" message="Notifications are off. You may miss hearing reminders." actionLabel="Open settings" onAction={() => {}} />
              <Banner tone="info" message="Tip: tap a stat card to filter your cases." onDismiss={() => {}} />
            </ComponentDoc>
            <ComponentDoc name="Empty state" cmp="CMP-50">
              <EmptyState icon={IconBriefcase} title="No cases yet" message="Add your first case to start tracking hearings." actionLabel="Add your first case" onAction={() => {}} />
            </ComponentDoc>
            <ComponentDoc name="Skeleton" cmp="CMP-51" description="Matches the final layout so content doesn't jump.">
              <SkeletonCard />
              <SkeletonRow />
            </ComponentDoc>
          </DocSection>

          {/* ───────────── OVERLAYS ───────────── */}
          <DocSection onLayout={mark('Overlays')} eyebrow="CMP-52 – 56" title="Overlays">
            <ComponentDoc name="Dropdown menu" description="Anchored to its trigger. Used by selects and overflow menus.">
              <View ref={menuAnchor} collapsable={false}>
                <Button label="Case actions" variant="outline" size="md" fullWidth trailingIcon={IconArrowRight} onPress={() => setMenu(true)} />
              </View>
              <Dropdown open={menu} onClose={() => setMenu(false)} anchorRef={menuAnchor}>
                <MenuItem label="Edit case" icon={IconEdit} control="none" onPress={() => setMenu(false)} />
                <MenuItem label="Share summary" icon={IconShare} control="none" onPress={() => setMenu(false)} />
                <MenuItem label="Archive" icon={IconArchive} control="none" onPress={() => setMenu(false)} />
                <MenuItem label="Delete case" icon={IconTrash} control="none" destructive onPress={() => setMenu(false)} />
              </Dropdown>
            </ComponentDoc>
            <ComponentDoc name="Bottom sheet and action sheet" cmp="CMP-52 · 54">
              <Row>
                <Button size="sm" variant="tonal" label="Bottom sheet" onPress={() => setSheet(true)} />
                <Button size="sm" variant="tonal" label="Action sheet" onPress={() => setActions(true)} />
              </Row>
            </ComponentDoc>
            <ComponentDoc name="Dialog" cmp="CMP-53">
              <Row>
                <Button size="sm" variant="tonal" label="Confirm" onPress={() => setDialog('confirm')} />
                <Button size="sm" variant="destructive-soft" label="Destructive" onPress={() => setDialog('destructive')} />
                <Button size="sm" variant="tonal" label="Info" onPress={() => setDialog('info')} />
              </Row>
            </ComponentDoc>
          </DocSection>
        </View>
      </ScrollView>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Update outcome" footer={<Button label="Save" onPress={() => setSheet(false)} fullWidth />}>
        <View className="gap-4 px-5">
          <View className="flex-row flex-wrap gap-2">
            {['Adjourned', 'Heard', 'Arguments done', 'Order reserved', 'Disposed'].map((o) => (
              <ChoiceChip key={o} label={o} selected={o === 'Adjourned'} onPress={() => {}} />
            ))}
          </View>
          <DatePicker label="Next date" value={date} onChange={setDate} />
        </View>
      </BottomSheet>

      <ActionSheet
        open={actions}
        onClose={() => setActions(false)}
        title="Mehta v. Shah"
        actions={[
          { key: 'edit', label: 'Edit case', icon: IconEdit, onPress: () => {} },
          { key: 'status', label: 'Change status', icon: IconGavel, onPress: () => {} },
          { key: 'doc', label: 'Add document', icon: IconFileText, onPress: () => {} },
          { key: 'archive', label: 'Archive', icon: IconArchive, onPress: () => {} },
          { key: 'delete', label: 'Delete case', icon: IconTrash, destructive: true, onPress: () => {} },
        ]}
      />

      <Dialog open={dialog === 'confirm'} onClose={() => setDialog(null)} title="Discard draft?" message="Your case details on this step will be lost." confirmLabel="Discard" onConfirm={() => setDialog(null)} />
      <Dialog
        open={dialog === 'destructive'}
        onClose={() => setDialog(null)}
        variant="destructive"
        title="Delete this case?"
        message="Hearings, notes, documents and fees will be removed. You can restore it within 30 days."
        confirmText="CS/1234/2026"
        onConfirm={() => setDialog(null)}
      />
      <Dialog open={dialog === 'info'} onClose={() => setDialog(null)} variant="info" title="Reminders" message="You'll get a digest at 8 PM the day before and 8 AM on the day." />
    </View>
  );
}
