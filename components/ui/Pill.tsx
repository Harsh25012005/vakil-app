import { View } from 'react-native';
import { cn } from '@/utils/cn';
import type { FillTone } from '@/constants/theme';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { fillBg, fillText } from '@/components/ui/tone';

const dotBg: Record<FillTone, string> = {
  primary: 'bg-primary',
  neutral: 'bg-text-3',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
  adjourned: 'bg-adjourned',
};

export type PillProps = {
  label: string;
  tone?: FillTone;
  /** sm 22, md 26 (FRS CMP-25). */
  size?: 'sm' | 'md';
  icon?: IconComponent;
  /** 6 dp dot instead of an icon. */
  dot?: boolean;
  accessibilityLabel?: string;
  className?: string;
};

/** Generic tinted pill: status subtle bg + status text. Basis of StatusPill and outcome pills. */
export function Pill({ label, tone = 'neutral', size = 'md', icon, dot, accessibilityLabel, className }: PillProps) {
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      className={cn(
        'flex-row items-center self-start rounded-full',
        size === 'sm' ? 'h-[22px] gap-1 px-2' : 'h-[26px] gap-1.5 px-2.5',
        fillBg[tone],
        className,
      )}
    >
      {icon ? <Icon icon={icon} size={14} tone={fillText[tone]} /> : null}
      {!icon && dot ? <View className={cn('h-1.5 w-1.5 rounded-full', dotBg[tone])} /> : null}
      <Text variant="caption" tone={fillText[tone]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}
