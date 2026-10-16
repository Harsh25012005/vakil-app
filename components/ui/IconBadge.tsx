import { View } from 'react-native';
import { cn } from '@/utils/cn';
import type { FillTone } from '@/constants/theme';
import { Icon, type IconComponent } from '@/components/ui/Icon';
import { fillBg, fillText } from '@/components/ui/tone';

const sizes = {
  sm: { box: 'h-8 w-8', icon: 16 },
  md: { box: 'h-10 w-10', icon: 20 },
  lg: { box: 'h-12 w-12', icon: 24 },
  xl: { box: 'h-[72px] w-[72px]', icon: 32 },
} as const;

type Props = {
  icon: IconComponent;
  tone?: FillTone;
  size?: keyof typeof sizes;
  className?: string;
};

/** Icon inside a tinted circle. Shared by quick actions, stat cards, empty states, dialogs, list rows. */
export function IconBadge({ icon, tone = 'primary', size = 'md', className }: Props) {
  const s = sizes[size];
  return (
    <View className={cn('items-center justify-center rounded-full', s.box, fillBg[tone], className)}>
      <Icon icon={icon} size={s.icon} tone={fillText[tone]} />
    </View>
  );
}
