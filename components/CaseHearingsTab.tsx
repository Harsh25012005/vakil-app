import { IconCalendarPlus, IconCircleCheck, IconEdit } from '@tabler/icons-react-native';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { CaseDetail } from '@/services/cases';
import { todayISO } from '@/utils/date';
import type { Hearing } from '@/services/types';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Timeline, type TimelineItem } from '@/components/ui/Timeline';

type Props = {
  c: CaseDetail;
  onAdd: () => void;
  onEdit: (h: Hearing) => void;
  onOutcome: (h: Hearing) => void;
};

/** SCR-20 Hearings tab: the case's full timeline (future above a Today marker), tap a node for actions. */
export function CaseHearingsTab({ c, onAdd, onEdit, onOutcome }: Props) {
  const [menu, setMenu] = useState<Hearing | null>(null);

  const items = useMemo<TimelineItem[]>(
    () => c.hearings.map((h) => ({ id: h.id, date: h.date, time: h.time, purpose: h.purpose, outcome: h.outcome, notes: h.outcomeNotes, onPress: () => setMenu(h) })),
    [c.hearings],
  );

  return (
    <View className="gap-5">
      {c.hearings.length === 0 ? (
        <EmptyState icon={IconCalendarPlus} title="No hearings yet" message="Add the next date so this case shows on your calendar and reminders." actionLabel="Add hearing" onAction={onAdd} />
      ) : (
        <>
          <SectionHeader title={`Hearings · ${c.hearings.length}`} actionLabel="Add" onAction={onAdd} first />
          <Timeline items={items} />
        </>
      )}

      <ActionSheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu ? `Hearing on ${menu.date}` : undefined}
        actions={
          menu
            ? [
                ...(!menu.completedAt ? [{ key: 'outcome', label: menu.date < todayISO() ? 'Record outcome' : 'Update outcome', icon: IconCircleCheck, onPress: () => onOutcome(menu) }] : []),
                { key: 'edit', label: 'Edit or delete hearing', icon: IconEdit, onPress: () => onEdit(menu) },
              ]
            : []
        }
      />
    </View>
  );
}
