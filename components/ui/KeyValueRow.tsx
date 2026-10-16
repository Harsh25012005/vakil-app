import { IconCopy } from '@tabler/icons-react-native';
import * as Clipboard from 'expo-clipboard';
import { Pressable, View } from 'react-native';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/utils/cn';
import { haptic } from '@/utils/haptics';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';

type Props = {
  label: string;
  value?: string | null;
  /** Case no. / CNR / phone (FR-CASE-12). */
  copyable?: boolean;
  tabular?: boolean;
  divider?: boolean;
};

/** CMP-30. Label left (text-2), value right. Missing values show an em dash, never blank. */
export function KeyValueRow({ label, value, copyable, tabular, divider }: Props) {
  const toast = useToast();
  const display = value?.trim() ? value : '—';

  const copy = async () => {
    if (!value) return;
    await Clipboard.setStringAsync(value);
    haptic.light();
    toast.show({ type: 'success', message: `${label} copied` });
  };

  return (
    <View className={cn('min-h-11 flex-row items-center gap-4 py-2.5', divider && 'border-b border-border')}>
      <Text variant="body-sm" tone="secondary" className="w-[38%]">
        {label}
      </Text>
      <View className="flex-1 flex-row items-center justify-end gap-2">
        <Text variant="body" tabular={tabular} selectable className="flex-shrink text-right">
          {display}
        </Text>
        {copyable && value ? (
          <Pressable onPress={copy} hitSlop={14} accessibilityRole="button" accessibilityLabel={`Copy ${label}`}>
            <Icon icon={IconCopy} size={16} tone="tertiary" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
