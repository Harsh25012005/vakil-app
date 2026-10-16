import { IconBrandWhatsapp, IconPhone } from '@tabler/icons-react-native';
import { View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { IconButton } from '@/components/ui/IconButton';
import { Text } from '@/components/ui/Text';
import { formatPhone } from '@/utils/format';

export type ClientCardProps = {
  name: string;
  phone: string;
  /** Omit to hide the "N cases" line (e.g. inside a case, where it is obvious). */
  caseCount?: number;
  onPress?: () => void;
  onCall?: () => void;
  onWhatsApp?: () => void;
};

/** CMP-41. Avatar, name, phone, case count, call / WhatsApp. */
export function ClientCard({ name, phone, caseCount, onPress, onCall, onWhatsApp }: ClientCardProps) {
  return (
    <Card onPress={onPress} accessibilityLabel={caseCount === undefined ? name : `${name}, ${caseCount} cases`} containsActions={!!(onCall || onWhatsApp)}>
      <View className="flex-row items-center gap-3">
        <Avatar name={name} size={40} />
        <View className="flex-1 gap-0.5">
          <Text variant="title" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="body-sm" tone="secondary" tabular>
            {`+91 ${formatPhone(phone)}`}
          </Text>
          {caseCount === undefined ? null : (
            <Text variant="caption" tone="tertiary">
              {caseCount === 1 ? '1 case' : `${caseCount} cases`}
            </Text>
          )}
        </View>
        {onCall ? <IconButton icon={IconPhone} accessibilityLabel={`Call ${name}`} onPress={onCall} variant="tonal" shape="circle" tone="primary" /> : null}
        {onWhatsApp ? (
          <IconButton icon={IconBrandWhatsapp} accessibilityLabel={`WhatsApp ${name}`} onPress={onWhatsApp} variant="tonal" shape="circle" tone="success" />
        ) : null}
      </View>
    </Card>
  );
}
