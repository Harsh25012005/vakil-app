import { IconDotsVertical, IconFileText, IconFileTypePdf, IconPhoto } from '@tabler/icons-react-native';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { formatDayMonth, type ISODate } from '@/utils/date';
import { formatBytes } from '@/utils/format';
import type { Tone } from '@/constants/theme';

export type DocumentTileProps = {
  name: string;
  mimeType: string;
  sizeBytes: number;
  date: ISODate;
  variant?: 'grid' | 'list';
  onPress?: () => void;
  onMore?: () => void;
};

function fileIcon(mime: string): { icon: typeof IconFileText; tone: Tone } {
  if (mime === 'application/pdf') return { icon: IconFileTypePdf, tone: 'error' };
  if (mime.startsWith('image/')) return { icon: IconPhoto, tone: 'info' };
  return { icon: IconFileText, tone: 'secondary' };
}

/** CMP-42. File-type icon, name, size, date, overflow menu. */
export function DocumentTile({ name, mimeType, sizeBytes, date, variant = 'grid', onPress, onMore }: DocumentTileProps) {
  const f = fileIcon(mimeType);
  const meta = `${formatBytes(sizeBytes)} · ${formatDayMonth(date)}`;
  const more = onMore ? <IconButton icon={IconDotsVertical} accessibilityLabel={`More actions for ${name}`} onPress={onMore} size="sm" /> : null;

  if (variant === 'list') {
    return (
      <Card onPress={onPress} accessibilityLabel={name} containsActions={!!onMore} className="py-3">
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-2">
            <Icon icon={f.icon} size={20} tone={f.tone} />
          </View>
          <View className="flex-1">
            <Text variant="body" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="caption" tone="tertiary" tabular>
              {meta}
            </Text>
          </View>
          {more}
        </View>
      </Card>
    );
  }

  return (
    <Card onPress={onPress} accessibilityLabel={name} containsActions={!!onMore} padded={false} className="flex-1">
      <View className="h-24 items-center justify-center bg-surface-2">
        <Icon icon={f.icon} size={32} tone={f.tone} />
      </View>
      <View className="gap-0.5 p-3 pr-9">
        <Text variant="body-sm" numberOfLines={2} className="font-sans-semibold">
          {name}
        </Text>
        <Text variant="caption" tone="tertiary" tabular>
          {meta}
        </Text>
      </View>
      {more ? <View className="absolute bottom-2 right-1">{more}</View> : null}
    </Card>
  );
}
