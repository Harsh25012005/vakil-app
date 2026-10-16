import { IconPin } from '@tabler/icons-react-native';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

export type NoteCardProps = {
  title?: string;
  body: string;
  /** "Updated 2h ago" */
  updatedLabel: string;
  pinned?: boolean;
  onPress?: () => void;
};

/** CMP-43. Title, 3-line preview, updated time; pinned = primary-subtle. */
export function NoteCard({ title, body, updatedLabel, pinned, onPress }: NoteCardProps) {
  return (
    <Card variant={pinned ? 'subtle' : 'default'} onPress={onPress} accessibilityLabel={`${pinned ? 'Pinned note' : 'Note'}${title ? `, ${title}` : ''}`}>
      <View className="flex-row items-start gap-2">
        {title ? (
          <Text variant="title" numberOfLines={1} className="flex-1">
            {title}
          </Text>
        ) : (
          <View className="flex-1" />
        )}
        {pinned ? <Icon icon={IconPin} size={16} tone="primary" strokeWidth={2} /> : null}
      </View>
      <Text variant="body-sm" tone="secondary" numberOfLines={3} className={title ? 'mt-1' : undefined}>
        {body}
      </Text>
      <Text variant="caption" tone="tertiary" className="mt-3">
        {updatedLabel}
      </Text>
    </Card>
  );
}
