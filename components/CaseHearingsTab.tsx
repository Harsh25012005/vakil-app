import { IconCalendarPlus, IconExternalLink, IconFileText, IconGavel } from '@tabler/icons-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useCaseOrders } from '@/hooks/useCases';
import { useTheme } from '@/hooks/useTheme';
import type { CaseDetail } from '@/services/cases';
import { formatShortDate } from '@/utils/date';
import type { CaseOrder, Hearing } from '@/services/types';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';
import { EcourtsSyncRow } from './CaseOrders';
import { useOpenOrder } from './OrderViewer';

type Props = {
  c: CaseDetail;
  onAdd: () => void;
  onEdit: (h: Hearing) => void;
};

const orderLabel = (o: CaseOrder) => (o.kind === 'judgment' ? 'Judgment' : 'Order');

/** One order document: tap to open its PDF in the browser. */
function OrderDoc({ o, opening, onOpen }: { o: CaseOrder; opening: boolean; onOpen: () => void }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Open ${orderLabel(o).toLowerCase()} of ${formatShortDate(o.date)}`}
      className="flex-row items-center gap-2.5 self-stretch rounded-lg border border-border bg-surface px-3 py-2.5"
    >
      <Icon icon={o.kind === 'judgment' ? IconGavel : IconFileText} size={18} tone="primary" />
      <View className="flex-1">
        <Text variant="body-sm" numberOfLines={1}>
          {`${orderLabel(o)} · ${formatShortDate(o.date)}`}
        </Text>
        {o.description && o.description.toLowerCase() !== orderLabel(o).toLowerCase() ? (
          <Text variant="caption" tone="tertiary" numberOfLines={1}>
            {o.description}
          </Text>
        ) : null}
      </View>
      {opening ? <ActivityIndicator size="small" color={colors.primary} /> : <Icon icon={IconExternalLink} size={16} tone="tertiary" />}
    </PressableScale>
  );
}

/**
 * SCR-20 Hearings tab: the case's full timeline (future above a Today marker). Dates and what
 * happened come from the court (eCourts cases); cases without a CNR are edited by tapping a date.
 */
export function CaseHearingsTab({ c, onAdd, onEdit }: Props) {
  // eCourts cases update from the court by themselves; only cases without a CNR are kept by hand.
  const manual = !c.cnr;
  const orders = useCaseOrders(c.id);
  const { open, opening, viewer } = useOpenOrder();

  const { byDate, unmatched } = useMemo(() => {
    const dates = new Set(c.hearings.map((h) => h.date));
    const map = new Map<string, CaseOrder[]>();
    const rest: CaseOrder[] = [];
    for (const o of orders.data ?? []) {
      if (dates.has(o.date)) map.set(o.date, [...(map.get(o.date) ?? []), o]);
      else rest.push(o);
    }
    return { byDate: map, unmatched: rest };
  }, [c.hearings, orders.data]);

  const docs = (list: CaseOrder[]) => (
    <View className="gap-2">
      {list.map((o) => (
        <OrderDoc key={o.id} o={o} opening={opening === o.id} onOpen={() => void open(o)} />
      ))}
    </View>
  );

  const items = useMemo<TimelineItem[]>(
    () =>
      c.hearings.map((h) => {
        const dayOrders = byDate.get(h.date);
        return {
          id: h.id,
          date: h.date,
          time: h.time,
          purpose: [h.purpose, h.itemNumber ? `Item ${h.itemNumber}` : undefined, h.courtRoom ? `Room ${h.courtRoom}` : undefined].filter(Boolean).join(' · ') || undefined,
          outcome: h.outcome,
          description: h.courtBusiness,
          notes: h.outcomeNotes,
          footer: dayOrders?.length ? docs(dayOrders) : undefined,
          onPress: manual ? () => onEdit(h) : undefined,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [c.hearings, byDate, opening, manual],
  );

  return (
    <View className="gap-5">
      {c.hearings.length === 0 ? (
        manual ? (
          <EmptyState icon={IconCalendarPlus} title="No hearings yet" message="Add the next date so this case shows on your calendar and reminders." actionLabel="Add hearing" onAction={onAdd} />
        ) : (
          <EmptyState icon={IconCalendarPlus} title="No hearings yet" message="Hearing dates come from the court and appear here as soon as eCourts lists them." />
        )
      ) : (
        <>
          <SectionHeader title={`Hearings · ${c.hearings.length}`} actionLabel={manual ? 'Add' : undefined} onAction={manual ? onAdd : undefined} first />
          <Timeline items={items} />
        </>
      )}

      {unmatched.length ? (
        <View className="gap-2">
          <SectionHeader title="Other court orders" first={c.hearings.length === 0} className="mb-1" />
          {docs(unmatched)}
        </View>
      ) : null}

      <EcourtsSyncRow c={c} />
      {viewer}
    </View>
  );
}
