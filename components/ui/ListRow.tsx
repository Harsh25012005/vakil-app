import { IconChevronRight } from '@tabler/icons-react-native';
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '@/utils/cn';
import type { FillTone } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { IconBadge } from '@/components/ui/IconBadge';
import { PressableScale } from '@/components/ui/PressableScale';
import { Text } from '@/components/ui/Text';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  /** Third line (caption). */
  meta?: string;
  leadingIcon?: IconComponent;
  leadingTone?: FillTone;
  /** Custom leading node (Avatar, Checkbox...). */
  leading?: ReactNode;
  /** 'chevron' | value text | any node (Toggle, Badge). */
  trailing?: 'chevron' | ReactNode;
  value?: string;
  destructive?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Set by ListGroup: inset divider aligned with the text column. */
  divider?: boolean;
  accessibilityLabel?: string;
};

/**
 * CMP-28. 1/2/3-line, min 56. The divider lives inside the text column, so it is always inset
 * exactly to where the text starts, whatever the leading element.
 */
export function ListRow({
  title,
  subtitle,
  meta,
  leadingIcon,
  leadingTone = 'neutral',
  leading,
  trailing,
  value,
  destructive,
  onPress,
  disabled,
  divider,
  accessibilityLabel,
}: ListRowProps) {
  const lead = leading ?? (leadingIcon ? <IconBadge icon={leadingIcon} tone={destructive ? 'error' : leadingTone} size="sm" /> : null);

  const content = (pressed: boolean) => (
    <View className={cn('flex-row pl-4', pressed && 'bg-surface-2')}>
      {lead ? <View className="justify-center py-3 pr-3">{lead}</View> : null}
      <View className="min-h-14 flex-1 flex-row items-center gap-3 py-3 pr-4">
        <View className="flex-1 gap-0.5">
          <Text variant="body" tone={destructive ? 'error' : 'default'} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="body-sm" tone="secondary" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
          {meta ? (
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text variant="body" tone="tertiary" numberOfLines={1}>
            {value}
          </Text>
        ) : null}
        {trailing === 'chevron' ? <Icon icon={IconChevronRight} size={20} tone="tertiary" /> : trailing}
        {divider ? <View className="absolute bottom-0 left-0 right-0 h-px bg-border" /> : null}
      </View>
    </View>
  );

  if (!onPress) return content(false);
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? [title, subtitle, value].filter(Boolean).join(', ')}
    >
      {({ pressed }) => content(pressed)}
    </PressableScale>
  );
}

/** Groups rows in one rounded-lg card with inset dividers between them (settings, detail lists). */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  const rows = Children.toArray(children).filter(isValidElement) as ReactElement<ListRowProps>[];
  return (
    <Card padded={false} className={className}>
      {rows.map((row, i) => cloneElement(row, { divider: i < rows.length - 1 }))}
    </Card>
  );
}
