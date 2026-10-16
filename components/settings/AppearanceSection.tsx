import { IconDeviceMobile, IconMoon, IconSun } from '@tabler/icons-react-native';
import type { Theme } from '@vakil/shared';
import { View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { SheetOption } from '@/components/ui/SheetOption';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/useTheme';

const OPTIONS: { value: Theme; label: string; description: string; icon: typeof IconMoon }[] = [
  { value: 'dark', label: 'Dark', description: 'True black. Easy on the eyes in dim courtrooms.', icon: IconMoon },
  { value: 'light', label: 'Light', description: 'Bright and crisp for daytime use.', icon: IconSun },
  { value: 'system', label: 'Match device', description: 'Follows your phone setting automatically.', icon: IconDeviceMobile },
];

/** SCR-44 Appearance. The change applies instantly and is saved to the profile by ThemeProvider. */
export function AppearanceSection() {
  const { mode, setMode } = useTheme();
  return (
    <View className="gap-3">
      <Card className="p-2">
        {OPTIONS.map((o) => (
          <SheetOption key={o.value} label={o.label} description={o.description} icon={o.icon} selected={mode === o.value} control="radio" onPress={() => setMode(o.value)} />
        ))}
      </Card>
      <Text variant="caption" tone="tertiary" className="px-1">
        Your choice is remembered on this device.
      </Text>
    </View>
  );
}
