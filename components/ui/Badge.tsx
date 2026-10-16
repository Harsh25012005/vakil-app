import { View } from 'react-native';
import { cn } from '@/utils/cn';
import { Text } from '@/components/ui/Text';

type Props =
  | { variant: 'count'; count: number; className?: string }
  | { variant: 'dot'; className?: string }
  | { variant: 'text'; label: string; className?: string };

/** CMP-26. Count (error, max "99+"), Dot, Text ("New"). 18 dp min, rounded-full. */
export function Badge(props: Props) {
  if (props.variant === 'dot') {
    return <View accessibilityLabel="New" className={cn('h-2.5 w-2.5 rounded-full border-2 border-bg bg-error', props.className)} />;
  }
  if (props.variant === 'text') {
    return (
      <View className={cn('h-[18px] items-center justify-center rounded-full bg-primary-subtle px-1.5', props.className)}>
        <Text variant="caption" tone="primary" className="font-sans-bold">
          {props.label}
        </Text>
      </View>
    );
  }
  if (props.count <= 0) return null;
  return (
    <View
      accessibilityLabel={`${props.count} unread`}
      className={cn('h-[18px] min-w-[18px] items-center justify-center rounded-full bg-error px-1', props.className)}
    >
      <Text variant="caption" tone="on-primary" tabular className="font-sans-bold" style={{ fontSize: 11, lineHeight: 14 }}>
        {props.count > 99 ? '99+' : String(props.count)}
      </Text>
    </View>
  );
}
