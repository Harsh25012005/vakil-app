import {
  IconAlertTriangle,
  IconArchive,
  IconBriefcase,
  IconCalendarRepeat,
  IconCircleCheck,
  IconGavel,
  IconHourglass,
} from '@tabler/icons-react-native';
import type { HearingOutcome } from '@vakil/shared';
import type { FillTone } from '@/constants/theme';
import type { IconComponent } from '@/components/ui/Icon';
import { Pill } from '@/components/ui/Pill';

export type CaseStatusKind = 'active' | 'today' | 'adjourned' | 'reserved' | 'overdue' | 'disposed' | 'closed' | 'archived';

/** FRS 2.5 case status mapping. */
export const caseStatusMap: Record<CaseStatusKind, { label: string; tone: FillTone; icon: IconComponent }> = {
  active: { label: 'Active', tone: 'primary', icon: IconBriefcase },
  today: { label: 'Hearing today', tone: 'warning', icon: IconGavel },
  adjourned: { label: 'Adjourned', tone: 'adjourned', icon: IconCalendarRepeat },
  reserved: { label: 'Reserved for order', tone: 'info', icon: IconHourglass },
  overdue: { label: 'Overdue', tone: 'error', icon: IconAlertTriangle },
  disposed: { label: 'Disposed', tone: 'success', icon: IconCircleCheck },
  closed: { label: 'Closed', tone: 'neutral', icon: IconArchive },
  archived: { label: 'Archived', tone: 'neutral', icon: IconArchive },
};

type Props = {
  status: CaseStatusKind;
  size?: 'sm' | 'md';
  /** icon (default) or 6 dp dot. */
  indicator?: 'icon' | 'dot';
  className?: string;
};

/** CMP-25. Reads as "Status: Adjourned". Colour is never the only signal: text + icon always. */
export function StatusPill({ status, size = 'md', indicator = 'icon', className }: Props) {
  const s = caseStatusMap[status];
  return (
    <Pill
      label={s.label}
      tone={s.tone}
      size={size}
      icon={indicator === 'icon' ? s.icon : undefined}
      dot={indicator === 'dot'}
      accessibilityLabel={`Status: ${s.label}`}
      className={className}
    />
  );
}

export const outcomeMap: Record<HearingOutcome, { label: string; tone: FillTone }> = {
  adjourned: { label: 'Adjourned', tone: 'adjourned' },
  heard: { label: 'Heard', tone: 'primary' },
  arguments_done: { label: 'Arguments done', tone: 'primary' },
  evidence: { label: 'Evidence recorded', tone: 'info' },
  reserved: { label: 'Order reserved', tone: 'info' },
  disposed: { label: 'Disposed', tone: 'success' },
  not_reached: { label: 'Not reached', tone: 'warning' },
  other: { label: 'Other', tone: 'neutral' },
};

/** Hearing outcome pill used on the timeline and hearing cards. */
export function OutcomePill({ outcome, size = 'sm' }: { outcome: HearingOutcome; size?: 'sm' | 'md' }) {
  const o = outcomeMap[outcome];
  return <Pill label={o.label} tone={o.tone} size={size} dot accessibilityLabel={`Outcome: ${o.label}`} />;
}
