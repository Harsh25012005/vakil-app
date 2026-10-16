import { IconUser } from '@tabler/icons-react-native';
import { Image, View } from 'react-native';
import { hashIndex, initials } from '@/utils/format';
import { avatarTints } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from '@/components/ui/Icon';
import { Text, type TextVariant } from '@/components/ui/Text';

export type AvatarSize = 24 | 32 | 40 | 56 | 80;

const textFor: Record<AvatarSize, TextVariant> = { 24: 'caption', 32: 'caption', 40: 'body-sm', 56: 'title', 80: 'h2' };

type Props = {
  name?: string;
  uri?: string;
  size?: AvatarSize;
  /** Advocate avatar: 2 dp primary ring with a 2 dp gap. */
  ring?: boolean;
};

/** CMP-27. Initials (tint hashed from name across 6 tints), image, or icon. rounded-full. */
export function Avatar({ name, uri, size = 40, ring }: Props) {
  const { scheme } = useTheme();
  const tints = avatarTints[scheme];
  const tint = tints[name ? hashIndex(name, tints.length) : 0] ?? tints[0]!;

  const body = (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name ?? 'Avatar'}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint.bg }}
      className="items-center justify-center overflow-hidden"
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : name ? (
        <Text variant={textFor[size]} className="font-sans-bold" style={{ color: tint.fg, fontSize: size === 24 ? 10 : undefined }}>
          {initials(name)}
        </Text>
      ) : (
        <Icon icon={IconUser} size={Math.round(size * 0.5)} color={tint.fg} />
      )}
    </View>
  );

  if (!ring) return body;
  return (
    <View className="rounded-full border-2 border-primary" style={{ padding: 2 }}>
      {body}
    </View>
  );
}
