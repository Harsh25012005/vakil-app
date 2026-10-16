import { IconAlertTriangle, IconBuildingBank, IconCalendarEvent } from '@tabler/icons-react-native';
import { View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { InfoTag } from '@/components/ui/InfoTag';
import { StatusPill, type CaseStatusKind } from '@/components/ui/StatusPill';
import { Text } from '@/components/ui/Text';
import { cn } from '@/utils/cn';
import { formatLongDate, type ISODate } from '@/utils/date';

export type CaseCardProps = {
  title: string;
  caseNumber?: string;
  court: string;
  nextDate?: ISODate | null;
  status: CaseStatusKind;
  clientName?: string;
  /** Next date in the past or missing: red border + warning icon (FR-CASE-07). */
  overdue?: boolean;
  archived?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
};

/** CMP-39. Calm density: title, court, next date. Everything else is one tap away. */
export function CaseCard({ title, caseNumber, court, nextDate, status, clientName, overdue, archived, onPress, onLongPress }: CaseCardProps) {
  const dateLabel = nextDate ? formatLongDate(nextDate) : 'No next date';
  return (
    <Card onPress={onPress} onLongPress={onLongPress} accessibilityLabel={`${title}, ${court}, next date ${dateLabel}`} className={cn(archived && 'opacity-70', overdue && 'border-error')}>
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-0.5">
          <Text variant="title" numberOfLines={2}>
            {title}
          </Text>
          {caseNumber ? (
            <Text variant="caption" tone="tertiary" tabular>
              {caseNumber}
            </Text>
          ) : null}
        </View>
        <StatusPill status={archived ? 'archived' : overdue ? 'overdue' : status} size="sm" />
      </View>

      <View className="mt-3 flex-row items-end gap-3">
        <View className="flex-1 gap-1.5">
          <InfoTag icon={IconBuildingBank} label={court} />
          <InfoTag icon={overdue ? IconAlertTriangle : IconCalendarEvent} label={dateLabel} tone={overdue ? 'error' : 'secondary'} tabular />
        </View>
        {clientName ? <Avatar name={clientName} size={32} /> : null}
      </View>
    </Card>
  );
}
